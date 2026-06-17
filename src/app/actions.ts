"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fillW9 } from "@/lib/w9";
import { fillICA } from "@/lib/ica";
import { sendMail, BOOKKEEPING_EMAIL } from "@/lib/email";

const TEAM_SIG_PATH = "config/team-signature.png";
import { QUESTIONNAIRE } from "@/lib/questionnaire";

// Agent marks a self-serve task complete (or unchecks it).
export async function toggleSelfTask(agentTaskId: string, done: boolean) {
  const supabase = await createClient();
  await supabase
    .from("agent_tasks")
    .update({
      status: done ? "verified" : "not_started",
      completed_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);
  revalidatePath("/agent");
  revalidatePath("/admin");
}

// Agent bumps a rep/recurring counter; auto-completes when target reached.
export async function bumpCounter(agentTaskId: string, target: number | null) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("agent_tasks")
    .select("progress_count")
    .eq("id", agentTaskId)
    .single();
  const next = (row?.progress_count ?? 0) + 1;
  const complete = target != null && next >= target;
  await supabase
    .from("agent_tasks")
    .update({
      progress_count: next,
      status: complete ? "verified" : "in_progress",
      completed_at: complete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);
  revalidatePath("/agent");
}

// Admin (Noah/Tiffany) verifies or rejects a task in the review queue.
export async function verifyTask(agentTaskId: string, approve: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("agent_tasks")
    .update({
      status: approve ? "verified" : "rejected",
      verified_by: user?.id,
      completed_at: approve ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);
  revalidatePath("/admin");
  revalidatePath("/agent");
}

// Admin creates a new agent (triggers auto-instantiation of their task list).
export async function createAgent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const states: string[] = [];
  if (formData.get("ga")) states.push("GA");
  if (formData.get("sc")) states.push("SC");

  await supabase.from("agents").insert({
    full_name: String(formData.get("full_name")),
    email: String(formData.get("email")),
    start_date: (formData.get("start_date") as string) || null,
    license: String(formData.get("license")), // 'newly_licensed' | 'transferring'
    license_states: states,
    is_new: !!formData.get("is_new"),
    created_by: user?.id,
  });
  revalidatePath("/admin");
}

const BOOKKEEPING_DOCS = ["w9", "direct_deposit", "voided_check", "drivers_license"];

// Agent uploaded a file (already in Storage at `path`). Record it on the task.
export async function recordUpload(agentTaskId: string, path: string) {
  const supabase = await createClient();
  const { data: at } = await supabase
    .from("agent_tasks")
    .select("agent_id, task:tasks(key, verifier)")
    .eq("id", agentTaskId)
    .single();
  const task = at?.task as unknown as { key: string; verifier: string } | undefined;
  const isAuto = task?.verifier === "auto";

  await supabase
    .from("agent_tasks")
    .update({
      evidence_url: path,
      status: isAuto ? "verified" : "submitted",
      completed_at: isAuto ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);

  // Bookkeeping-routed documents
  if (task && BOOKKEEPING_DOCS.includes(task.key) && at?.agent_id) {
    await supabase.from("documents").insert({
      agent_id: at.agent_id,
      doc_type: task.key,
      file_url: path,
      signed: task.key === "w9" || task.key === "direct_deposit",
    });
    await supabase.from("events").insert({
      agent_id: at.agent_id,
      type: "doc_submitted",
      message: `Document "${task.key}" submitted — routed to ${BOOKKEEPING_EMAIL}.`,
    });
    // Email the file to bookkeeping.
    const { data: file } = await supabase.storage.from("agent-files").download(path);
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = path.split(".").pop() ?? "pdf";
      await sendMail({
        to: BOOKKEEPING_EMAIL,
        subject: `New onboarding document: ${task.key}`,
        text: `A new ${task.key} was submitted through agent onboarding. File attached.`,
        attachments: [{ filename: `${task.key}.${ext}`, content: buf }],
      });
    }
  }
  revalidatePath("/agent");
  revalidatePath("/admin");
}

// Agent signs the W-9: fills the official IRS form, stores it, emails bookkeeping.
export async function signW9(formData: FormData) {
  const supabase = await createClient();
  const agentTaskId = String(formData.get("agent_task_id"));

  const { data: at } = await supabase
    .from("agent_tasks")
    .select("agent_id")
    .eq("id", agentTaskId)
    .single();
  if (!at?.agent_id) return { error: "Could not find your task." };

  const sig = String(formData.get("signature") || "");
  const sigPng = sig.startsWith("data:image")
    ? Buffer.from(sig.split(",")[1], "base64")
    : undefined;

  const today = new Date().toISOString().slice(0, 10);
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await fillW9({
      name: String(formData.get("name")),
      business: String(formData.get("business") || ""),
      classification: String(formData.get("classification") || "individual"),
      address1: String(formData.get("address1")),
      cityStateZip: String(formData.get("city_state_zip")),
      ssn: String(formData.get("ssn") || ""),
      ein: String(formData.get("ein") || ""),
      signaturePng: sigPng,
      date: today,
    });
  } catch (e) {
    return { error: "Could not generate the W-9 PDF." };
  }

  const path = `${at.agent_id}/w9-${Date.now()}.pdf`;
  const buf = Buffer.from(pdfBytes);
  const { error: upErr } = await supabase.storage
    .from("agent-files")
    .upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (upErr) return { error: "Could not save the W-9." };

  await supabase
    .from("agent_tasks")
    .update({
      evidence_url: path,
      status: "verified",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);

  await supabase.from("documents").insert({
    agent_id: at.agent_id,
    doc_type: "w9",
    file_url: path,
    signed: true,
  });
  await supabase.from("events").insert({
    agent_id: at.agent_id,
    type: "doc_submitted",
    message: `Signed W-9 completed — routed to ${BOOKKEEPING_EMAIL}.`,
  });

  const mail = await sendMail({
    to: BOOKKEEPING_EMAIL,
    subject: "Signed W-9 — new agent onboarding",
    text: "A new agent completed and signed their W-9. The signed IRS form is attached.",
    attachments: [{ filename: "W-9-signed.pdf", content: buf }],
  });
  if (mail.error) {
    await supabase.from("events").insert({
      agent_id: at.agent_id,
      type: "email_failed",
      message: `W-9 saved but email to ${BOOKKEEPING_EMAIL} failed — send manually. (${mail.error})`,
    });
  }

  revalidatePath("/agent");
  revalidatePath("/admin");
  return {};
}

// Agent logs one MaverickRE roleplay attempt (score 0-10 + optional result file).
export async function logRoleplay(agentTaskId: string, score: number, path: string | null) {
  const supabase = await createClient();
  const { data: at } = await supabase
    .from("agent_tasks")
    .select("agent_id, task:tasks(target_count, pass_threshold)")
    .eq("id", agentTaskId)
    .single();
  if (!at?.agent_id) return;
  const meta = at.task as unknown as { target_count: number | null; pass_threshold: number | null };
  const target = meta?.target_count ?? 10;
  const threshold = meta?.pass_threshold ?? 7;

  const { count } = await supabase
    .from("roleplay_attempts")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", at.agent_id);
  const attemptNo = (count ?? 0) + 1;

  await supabase.from("roleplay_attempts").insert({
    agent_id: at.agent_id,
    attempt_no: attemptNo,
    score,
    result_url: path,
  });

  // Recompute: need >= target attempts, last 3 all >= threshold.
  const { data: recent } = await supabase
    .from("roleplay_attempts")
    .select("score")
    .eq("agent_id", at.agent_id)
    .order("attempt_no", { ascending: false })
    .limit(3);
  const last3Pass = (recent ?? []).length >= 3 && (recent ?? []).every((r) => Number(r.score) >= threshold);
  const ready = attemptNo >= target && last3Pass;

  await supabase
    .from("agent_tasks")
    .update({
      progress_count: attemptNo,
      score,
      status: ready ? "submitted" : "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);

  if (ready) {
    await supabase.from("events").insert({
      agent_id: at.agent_id,
      type: "roleplay_submitted",
      message: `MaverickRE roleplay complete (${attemptNo} calls, last 3 ≥ ${threshold}) — ready to verify.`,
    });
  }
  revalidatePath("/agent");
  revalidatePath("/admin");
}

// Admin (Noah) saves his reusable signature, applied to Team Lead + Broker on every ICA.
export async function saveTeamSignature(formData: FormData) {
  const supabase = await createClient();
  const sig = String(formData.get("signature") || "");
  if (!sig.startsWith("data:image")) return { error: "Please sign in the box." };
  const buf = Buffer.from(sig.split(",")[1], "base64");
  const { error } = await supabase.storage
    .from("agent-files")
    .upload(TEAM_SIG_PATH, buf, { contentType: "image/png", upsert: true });
  if (error) return { error: "Could not save signature." };
  revalidatePath("/admin/signature");
  return { ok: true };
}

// Agent signs the ICA. Auto-finalizes with Noah's stored signature if present.
export async function signICA(formData: FormData) {
  const supabase = await createClient();
  const agentTaskId = String(formData.get("agent_task_id"));
  const agentName = String(formData.get("name"));

  const { data: at } = await supabase
    .from("agent_tasks")
    .select("agent_id, agent:agents(email)")
    .eq("id", agentTaskId)
    .single();
  if (!at?.agent_id) return { error: "Could not find your task." };

  const sig = String(formData.get("signature") || "");
  const agentSigPng = sig.startsWith("data:image") ? Buffer.from(sig.split(",")[1], "base64") : undefined;
  if (!agentSigPng) return { error: "Please sign in the box." };

  const today = new Date().toISOString().slice(0, 10);

  let teamSigPng: Buffer | undefined;
  const { data: teamFile } = await supabase.storage.from("agent-files").download(TEAM_SIG_PATH);
  if (teamFile) teamSigPng = Buffer.from(await teamFile.arrayBuffer());

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await fillICA({ agentName, date: today, agentSigPng, teamSigPng });
  } catch {
    return { error: "Could not generate the ICA PDF." };
  }

  const path = `${at.agent_id}/ica-${Date.now()}.pdf`;
  const buf = Buffer.from(pdfBytes);
  const { error: upErr } = await supabase.storage
    .from("agent-files")
    .upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (upErr) return { error: "Could not save the ICA." };

  const finalized = !!teamSigPng;
  await supabase
    .from("agent_tasks")
    .update({
      evidence_url: path,
      status: finalized ? "verified" : "submitted",
      completed_at: finalized ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);
  await supabase.from("documents").insert({ agent_id: at.agent_id, doc_type: "ica", file_url: path, signed: true });

  const agentEmail = (at.agent as unknown as { email?: string })?.email;
  const recipients = [BOOKKEEPING_EMAIL, agentEmail].filter(Boolean).join(",");
  const mail = await sendMail({
    to: recipients,
    subject: finalized ? "Executed ICA — The McBride Team" : "ICA signed by agent — needs your signature",
    text: finalized
      ? "The fully-executed Independent Contractor Agreement is attached."
      : "An agent signed the ICA. Save your team signature in admin to auto-finalize it.",
    attachments: [{ filename: "ICA-signed.pdf", content: buf }],
  });
  await supabase.from("events").insert({
    agent_id: at.agent_id,
    type: finalized ? "doc_submitted" : "ica_needs_countersign",
    message: finalized
      ? `Executed ICA completed — sent to ${recipients}.`
      : `ICA signed by agent — save your team signature in admin to finalize.`,
  });
  if (mail.error) {
    await supabase.from("events").insert({
      agent_id: at.agent_id,
      type: "email_failed",
      message: `ICA saved but email failed (${mail.error}).`,
    });
  }

  revalidatePath("/agent");
  revalidatePath("/admin");
  return {};
}

// Agent submits the Team Member Questionnaire (40 answers).
export async function saveQuestionnaire(formData: FormData) {
  const supabase = await createClient();
  const agentTaskId = String(formData.get("agent_task_id"));
  const { data: at } = await supabase
    .from("agent_tasks")
    .select("agent_id")
    .eq("id", agentTaskId)
    .single();
  if (!at?.agent_id) return;

  const answers: Record<string, string> = {};
  for (const item of QUESTIONNAIRE) answers[item.id] = String(formData.get(item.id) || "");

  await supabase.from("questionnaire_responses").insert({ agent_id: at.agent_id, answers });
  await supabase
    .from("agent_tasks")
    .update({ status: "verified", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", agentTaskId);

  revalidatePath("/agent");
  redirect("/agent");
}

// Admin sets/updates a training content URL (loom/doc) on a task.
export async function setContentUrl(formData: FormData) {
  const supabase = await createClient();
  const taskId = String(formData.get("task_id"));
  const url = String(formData.get("content_url")).trim();
  await supabase
    .from("tasks")
    .update({ content_url: url || null, content_state: url ? "exists" : "create" })
    .eq("id", taskId);
  revalidatePath("/admin/content");
  revalidatePath("/agent");
}

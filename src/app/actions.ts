"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fillW9 } from "@/lib/w9";
import { fillICA } from "@/lib/ica";
import { fillPerformance } from "@/lib/performance";
import { sendMail, BOOKKEEPING_EMAIL, NOTIFY_EMAIL } from "@/lib/email";
import { ensureAgentFolder, uploadToFolder } from "@/lib/drive";

const TEAM_SIG_PATH = "config/team-signature.png";
import { QUESTIONNAIRE } from "@/lib/questionnaire";

// Self-serve task keys that notify Noah the moment the agent completes them.
const NOTIFY_ON_COMPLETE: Record<string, string> = {
  zillow_confirm:
    "confirmed they created their Zillow Premier Agent account — add them to the team on Zillow Premier.",
};

// Agent marks a self-serve task complete (or unchecks it).
export async function toggleSelfTask(agentTaskId: string, done: boolean) {
  const supabase = await createClient();
  const { data: at } = await supabase
    .from("agent_tasks")
    .select("agent_id, task:tasks(key), agent:agents(full_name)")
    .eq("id", agentTaskId)
    .single();

  await supabase
    .from("agent_tasks")
    .update({
      status: done ? "verified" : "not_started",
      completed_at: done ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);

  const key = (at?.task as unknown as { key?: string } | undefined)?.key;
  if (done && key && NOTIFY_ON_COMPLETE[key] && at?.agent_id) {
    const name = (at.agent as unknown as { full_name?: string } | undefined)?.full_name ?? "An agent";
    const message = `${name} ${NOTIFY_ON_COMPLETE[key]}`;
    await supabase.from("events").insert({ agent_id: at.agent_id, type: "agent_action", message });
    await sendMail({ to: NOTIFY_EMAIL, subject: "Agent onboarding — action needed", text: message });
  }

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

  const fullName = String(formData.get("full_name"));
  const { data: agent } = await supabase
    .from("agents")
    .insert({
      full_name: fullName,
      email: String(formData.get("email")),
      start_date: (formData.get("start_date") as string) || null,
      license: String(formData.get("license")), // 'newly_licensed' | 'transferring'
      license_states: states,
      is_new: !!formData.get("is_new"),
      created_by: user?.id,
    })
    .select("id")
    .single();

  // Auto-create the agent's Google Drive folder (no-op until Drive is configured).
  if (agent?.id) {
    const folder = await ensureAgentFolder(fullName);
    if (folder.folderId) {
      await supabase.from("agents").update({ drive_folder_id: folder.folderId }).eq("id", agent.id);
    }
  }
  revalidatePath("/admin");
}

// Look up an agent's Drive folder id and mirror a signed document into it.
// Safe no-op if Drive isn't configured or the agent has no folder.
async function fileToDrive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agentId: string,
  filename: string,
  buf: Buffer,
) {
  const { data: a } = await supabase.from("agents").select("drive_folder_id").eq("id", agentId).single();
  const folderId = (a as { drive_folder_id?: string | null } | null)?.drive_folder_id;
  if (folderId) await uploadToFolder(folderId, filename, buf);
}

// Admin removes an agent. Cascades to agent_tasks, documents, roleplay_attempts,
// and events (FK on delete cascade). The agent's login/profile is left intact, so
// re-adding them with the same email rebuilds a fresh checklist they can sign back into.
export async function deleteAgent(agentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") return;

  await supabase.from("agents").delete().eq("id", agentId);
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
      await fileToDrive(supabase, at.agent_id, `${task.key}.${ext}`, buf);
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
  await fileToDrive(supabase, at.agent_id, "W-9-signed.pdf", buf);
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
  const target = meta?.target_count ?? 15;
  const threshold = meta?.pass_threshold ?? 8;

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

  // Checklist standard: >= target attempts (15) at an average >= threshold (8.0).
  const { data: all } = await supabase
    .from("roleplay_attempts")
    .select("score")
    .eq("agent_id", at.agent_id);
  const scores = (all ?? []).map((r) => Number(r.score));
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const ready = attemptNo >= target && avg >= threshold;

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
      message: `MaverickRE role plays complete (${attemptNo} calls, ${avg.toFixed(1)} average ≥ ${threshold}) — ready to verify.`,
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
  await fileToDrive(supabase, at.agent_id, "ICA-signed.pdf", buf);

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

// Agent signs the Team Performance Standards Policy. Auto-verifies, emails Noah + agent, files to Drive.
export async function signPerformance(formData: FormData) {
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
  const sigPng = sig.startsWith("data:image") ? Buffer.from(sig.split(",")[1], "base64") : undefined;
  if (!sigPng) return { error: "Please sign in the box." };

  const today = new Date().toISOString().slice(0, 10);
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await fillPerformance({ agentName, date: today, signaturePng: sigPng });
  } catch {
    return { error: "Could not generate the signed policy PDF." };
  }

  const path = `${at.agent_id}/performance-${Date.now()}.pdf`;
  const buf = Buffer.from(pdfBytes);
  const { error: upErr } = await supabase.storage
    .from("agent-files")
    .upload(path, buf, { contentType: "application/pdf", upsert: true });
  if (upErr) return { error: "Could not save the signed policy." };

  await supabase
    .from("agent_tasks")
    .update({
      evidence_url: path,
      status: "verified",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);
  await supabase
    .from("documents")
    .insert({ agent_id: at.agent_id, doc_type: "performance", file_url: path, signed: true });
  await fileToDrive(supabase, at.agent_id, "Performance-Standards-signed.pdf", buf);

  const agentEmail = (at.agent as unknown as { email?: string })?.email;
  const recipients = [NOTIFY_EMAIL, agentEmail].filter(Boolean).join(",");
  const mail = await sendMail({
    to: recipients,
    subject: "Signed Performance Standards Policy — The McBride Team",
    text: `${agentName} signed the Team Performance Standards Policy. The signed copy is attached.`,
    attachments: [{ filename: "Performance-Standards-signed.pdf", content: buf }],
  });
  await supabase.from("events").insert({
    agent_id: at.agent_id,
    type: "doc_submitted",
    message: `Performance Standards Policy signed by ${agentName}.`,
  });
  if (mail.error) {
    await supabase.from("events").insert({
      agent_id: at.agent_id,
      type: "email_failed",
      message: `Performance policy saved but email failed (${mail.error}).`,
    });
  }

  revalidatePath("/agent");
  revalidatePath("/admin");
  return {};
}

// Agent submits the two ZHL lenders they built a relationship with → notify Noah to confirm.
export async function submitLenders(formData: FormData) {
  const supabase = await createClient();
  const agentTaskId = String(formData.get("agent_task_id"));
  const lender1 = String(formData.get("lender1") || "").trim();
  const lender2 = String(formData.get("lender2") || "").trim();
  if (!lender1 || !lender2) return { error: "Please enter both lender names." };

  const { data: at } = await supabase
    .from("agent_tasks")
    .select("agent_id, agent:agents(full_name)")
    .eq("id", agentTaskId)
    .single();
  if (!at?.agent_id) return { error: "Could not find your task." };

  await supabase
    .from("agent_tasks")
    .update({
      notes: `Lenders: ${lender1}; ${lender2}`,
      status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentTaskId);

  const name = (at.agent as unknown as { full_name?: string } | undefined)?.full_name ?? "An agent";
  const message = `${name} built relationships with 2 ZHL lenders: ${lender1} and ${lender2}. Call to confirm, then verify.`;
  await supabase.from("events").insert({ agent_id: at.agent_id, type: "agent_action", message });
  await sendMail({ to: NOTIFY_EMAIL, subject: "Agent onboarding — ZHL lenders submitted", text: message });

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

// Agent logs a metric tap (conversation, preview, shadow, note, hour_of_power).
export async function logMetric(agentId: string, key: string, delta: number) {
  const allowed = ["conversation", "preview", "shadow", "note", "hour_of_power"];
  if (!allowed.includes(key)) return;
  const supabase = await createClient();
  await supabase.from("metric_events").insert({ agent_id: agentId, key, delta, source: "manual" });
  revalidatePath("/agent");
  revalidatePath("/admin");
}

// Manager signs off a gate once every criterion is met. Attribution matters:
// the clearance records who cleared it and when.
export async function clearGate(agentId: string, gateKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role, full_name").eq("id", user!.id).single();
  if (me?.role !== "admin") return;

  await supabase.from("agent_gates").upsert({ agent_id: agentId, gate_key: gateKey, cleared_by: user!.id });
  const label = gateKey === "g0" ? "Gate 0" : gateKey === "g8" ? "Launch Gate" : gateKey === "g30" ? "Day 30 review" : "Day 60 review";
  await supabase.from("events").insert({
    agent_id: agentId,
    type: "gate_signed",
    message: `${label} signed off by ${me?.full_name ?? "a manager"}.`,
  });
  revalidatePath("/agent");
  revalidatePath("/admin");
}

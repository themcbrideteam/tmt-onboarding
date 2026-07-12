import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QUESTIONNAIRE } from "@/lib/questionnaire";
import { clearGate, verifyTask, addNote } from "@/app/actions";
import VerifyButton from "../../verify-button";
import { Topbar, Ring, Trajectory, FlagList, GateBanner } from "@/components/ascent";
import {
  buildCtx, dayOf, insights, progressOf, currentStage, gateByKey, fmtDue,
  ROLE_LABEL, ROLE_COLOR, Stage, TaskRow,
} from "@/lib/journey";

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect("/agent");

  const { data: agent } = await supabase.from("agents").select("*").eq("id", id).single();
  if (!agent) redirect("/admin");

  const [{ data: stages }, { data: items }, { data: metricRows }, { data: rp }, { data: gateRows }, { data: notes }, { data: qr }, { data: authors }] =
    await Promise.all([
      supabase.from("stages").select("*").order("sort_order"),
      supabase.from("agent_tasks").select("*, task:tasks(*)").eq("agent_id", id),
      supabase.from("agent_metric_totals").select("*").eq("agent_id", id),
      supabase.from("roleplay_attempts").select("score").eq("agent_id", id),
      supabase.from("agent_gates").select("gate_key, cleared_at, cleared_by").eq("agent_id", id),
      supabase.from("agent_notes").select("*").eq("agent_id", id).order("created_at", { ascending: false }),
      supabase.from("questionnaire_responses").select("answers, created_at").eq("agent_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("id, full_name").eq("role", "admin"),
    ]);

  const tasks = (items ?? []) as unknown as TaskRow[];
  const ctx = buildCtx({
    startDate: agent.start_date,
    tasks,
    metricRows: metricRows as never,
    roleplayScores: (rp ?? []).map((r) => Number(r.score)),
    gateRows: gateRows as never,
  });
  const d = dayOf(ctx.startDate);
  const stageList = (stages ?? []) as Stage[];
  const phase = currentStage(ctx, stageList);
  const answers = (qr?.answers ?? {}) as Record<string, string>;
  const authorName = (pid: string | null) => (authors ?? []).find((a) => a.id === pid)?.full_name ?? "Team";

  const byStage = (stageId: string) =>
    tasks
      .filter((i) => i.task.stage_id === stageId)
      .sort((a, b) => (a.task.due_day ?? 0) - (b.task.due_day ?? 0) || a.task.sort_order - b.task.sort_order);

  return (
    <main className="a-wrap">
      <Topbar
        sub="Mission control"
        right={<Link href="/admin" className="a-btn ghost small" style={{ textDecoration: "none" }}>← Roster</Link>}
      />

      <div className="a-card hero">
        <div>
          <div className="eyebrow">
            {d < 1 ? `Starts in ${1 - d} day${1 - d === 1 ? "" : "s"}` : `Day ${d}`} · {phase?.title ?? ""} ·{" "}
            {agent.license === "transferring" ? "transferring" : "newly licensed"} · {agent.email}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
            <span className="dayno"><em>{agent.full_name}</em></span>
          </div>
          <Trajectory ctx={ctx} />
        </div>
        <div className="ring-float">
          <Ring pct={progressOf(ctx)} label={`${progressOf(ctx)}%`} subLabel="complete" />
        </div>
      </div>

      <FlagList flags={insights(ctx)} max={6} />

      <div className="admin-cols" style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 22, alignItems: "start" }}>
        <div>
          {stageList.map((s) => {
            const stageTasks = byStage(s.id);
            if (!stageTasks.length && !s.gate_key) return null;
            const doneCount = stageTasks.filter((t) => t.status === "verified").length;
            const pct = stageTasks.length ? Math.round((100 * doneCount) / stageTasks.length) : 0;
            return (
              <section key={s.id} className="phase">
                <div className="phase-head">
                  <h2 style={{ fontSize: 16 }}>{s.title}</h2>
                  <span className="range">{s.day_from != null ? `Day ${s.day_from < 0 ? "−" + Math.abs(s.day_from) : s.day_from} → ${s.day_to}` : ""}</span>
                  <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                  <span className="range a-num">{pct}%</span>
                </div>
                {stageTasks.map((t) => {
                  const owner = t.task.owner_role ?? "agent";
                  const over = t.status !== "verified" && !t.task.recurring && t.task.due_day != null && t.task.due_day < d;
                  const markDone = verifyTask.bind(null, t.id, true);
                  return (
                    <div key={t.id} className={`task ${t.status === "verified" ? "done" : ""}`} style={{ padding: "10px 15px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="task-title" style={{ fontSize: 13.5 }}>{t.task.title}</span>
                        <div className="task-meta" style={{ marginTop: 5 }}>
                          <span className="chip" style={{ color: ROLE_COLOR[owner] }}><span className="dot" />{ROLE_LABEL[owner] ?? owner}</span>
                          {t.progress_count > 0 && t.task.target_count && (
                            <span className="a-dimtxt a-num" style={{ fontSize: 11.5 }}>{t.progress_count}/{t.task.target_count}</span>
                          )}
                          {t.score != null && <span className="a-dimtxt a-num" style={{ fontSize: 11.5 }}>score {t.score}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
                        <span className={`duetag ${over ? "over" : ""}`}>{over ? "OVERDUE · " : ""}{fmtDue(t.task.due_day)}</span>
                        {t.status === "verified" ? (
                          <span className="vbadge ok">✓</span>
                        ) : t.status === "submitted" ? (
                          <VerifyButton agentTaskId={t.id} />
                        ) : owner !== "agent" ? (
                          <form action={markDone}><button className="a-btn small ghost">Done ✓</button></form>
                        ) : (
                          <span className="a-dimtxt" style={{ fontSize: 10.5 }}>{t.status === "in_progress" ? "in progress" : ""}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {s.gate_key && (
                  <GateBanner
                    ctx={ctx}
                    gate={gateByKey(s.gate_key)}
                    action={
                      <form action={clearGate.bind(null, agent.id, s.gate_key)}>
                        <button className="a-btn small solid">Sign off — clear {s.gate_key === "g8" ? "for launch" : "this gate"}</button>
                      </form>
                    }
                  />
                )}
              </section>
            );
          })}
        </div>

        <div>
          <div className="a-card panel" style={{ marginBottom: 20 }}>
            <h3>Coaching notes</h3>
            <form action={addNote} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input type="hidden" name="agent_id" value={agent.id} />
              <input name="body" placeholder="What did you see, what changes next…" className="a-input" style={{ flex: 1 }} />
              <button className="a-btn small solid">Add</button>
            </form>
            {(notes ?? []).map((n) => (
              <div key={n.id} className="queue-row">
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 12.5 }}>
                    {authorName(n.author_id)} · {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div className="a-muted" style={{ fontSize: 13 }}>{n.body}</div>
                </div>
              </div>
            ))}
            {(notes ?? []).length === 0 && <div className="a-empty">No notes yet.</div>}
          </div>

          <div className="a-card panel">
            <h3>Questionnaire — know your agent</h3>
            {qr ? (
              <dl style={{ margin: 0 }}>
                {QUESTIONNAIRE.map((item, i) => (
                  <div key={item.id} style={{ marginBottom: 12 }}>
                    <dt className="a-dimtxt" style={{ fontSize: 11.5 }}>{i + 1}. {item.q}</dt>
                    <dd style={{ margin: 0, fontSize: 13.5 }}>{answers[item.id] || <span className="a-dimtxt">—</span>}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="a-empty">Not submitted yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAgent, clearGate, verifyTask, promoteAdmin } from "@/app/actions";
import DeleteAgentButton from "./delete-agent-button";
import { Topbar, Ring, GateBanner, FlagList } from "@/components/ascent";
import {
  buildCtx, dayOf, insights, progressOf, currentStage, gateCleared, gateReady, gateByKey,
  GATES, isDone, ROLE_LABEL, Stage, TaskRow, Flag, AgentCtx,
} from "@/lib/journey";

type AgentRow = {
  id: string; full_name: string; email: string; start_date: string | null;
  license: string; is_new: boolean; status: string;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user!.id)
    .single();
  if (profile?.role !== "admin") redirect("/agent");

  const [{ data: agents }, { data: stages }, { data: allTasks }, { data: allMetrics }, { data: allRp }, { data: allGates }, { data: roleRows }, { data: profiles }] =
    await Promise.all([
      supabase.from("agents").select("*").order("created_at", { ascending: false }),
      supabase.from("stages").select("*").order("sort_order"),
      supabase.from("agent_tasks").select("*, task:tasks(*)"),
      supabase.from("agent_metric_totals").select("*"),
      supabase.from("roleplay_attempts").select("agent_id, score"),
      supabase.from("agent_gates").select("agent_id, gate_key, cleared_at, cleared_by"),
      supabase.from("role_assignments").select("role_key, person_name, email"),
      supabase.from("profiles").select("id, full_name, email, role").order("created_at"),
    ]);

  const stageList = (stages ?? []) as Stage[];
  const myRole =
    (roleRows ?? []).find((r) => r.email && profile?.email && r.email.toLowerCase() === profile.email.toLowerCase())?.role_key ?? null;
  const myRoleLabel = myRole ? ROLE_LABEL[myRole] : null;

  // Per-agent context
  const ctxOf = new Map<string, AgentCtx>();
  for (const a of (agents ?? []) as AgentRow[]) {
    ctxOf.set(
      a.id,
      buildCtx({
        startDate: a.start_date,
        tasks: ((allTasks ?? []) as unknown as (TaskRow & { agent_id: string })[]).filter((t) => t.agent_id === a.id),
        metricRows: (allMetrics ?? []).filter((m) => m.agent_id === a.id) as never,
        roleplayScores: (allRp ?? []).filter((r) => r.agent_id === a.id).map((r) => Number(r.score)),
        gateRows: (allGates ?? []).filter((g) => g.agent_id === a.id) as never,
      }),
    );
  }

  // Queue for the signed-in leader
  type QueueItem =
    | { kind: "do"; agent: AgentRow; t: TaskRow & { agent_id: string }; over: boolean }
    | { kind: "verify"; agent: AgentRow; t: TaskRow & { agent_id: string } }
    | { kind: "gate"; agent: AgentRow; gateKey: string };
  const queue: QueueItem[] = [];
  for (const a of (agents ?? []) as AgentRow[]) {
    const ctx = ctxOf.get(a.id)!;
    const d = dayOf(ctx.startDate);
    for (const t of ctx.tasks as (TaskRow & { agent_id: string })[]) {
      const role = t.task.owner_role ?? "agent";
      if (role !== "agent" && (!myRole || role === myRole) && !isDone(t) && t.status !== "submitted" && (t.task.due_day ?? 99) <= d + 3)
        queue.push({ kind: "do", agent: a, t, over: !t.task.recurring && (t.task.due_day ?? 99) < d });
      if (t.status === "submitted" && t.task.verifier === "admin")
        queue.push({ kind: "verify", agent: a, t });
    }
    for (const g of GATES) {
      if (!g.checkpoint && !gateCleared(ctx, g.key) && gateReady(ctx, g.key) && (!myRole || g.verifierRole === myRole || myRole === "broker"))
        queue.push({ kind: "gate", agent: a, gateKey: g.key });
    }
  }
  queue.sort((a, b) => ((b as { over?: boolean }).over ? 1 : 0) - ((a as { over?: boolean }).over ? 1 : 0));

  // Insight feed
  const allFlags: (Flag & { agent: string })[] = [];
  for (const a of (agents ?? []) as AgentRow[]) {
    for (const f of insights(ctxOf.get(a.id)!)) allFlags.push({ ...f, agent: a.full_name });
  }
  const sevRank = { crit: 0, warn: 1, info: 2, good: 3 };
  allFlags.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);

  const launched = ((agents ?? []) as AgentRow[]).filter((a) => gateCleared(ctxOf.get(a.id)!, "g8")).length;
  const atRisk = ((agents ?? []) as AgentRow[]).filter((a) => insights(ctxOf.get(a.id)!).some((f) => f.sev === "crit")).length;

  return (
    <main className="a-wrap">
      <Topbar
        sub="Mission control"
        right={
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="a-muted" style={{ fontSize: 13 }}>
              {profile?.full_name ?? user?.email}{myRoleLabel ? ` · ${myRoleLabel}` : ""}
            </span>
            <Link href="/agent/library" className="a-btn ghost small" style={{ textDecoration: "none" }}>Library</Link>
            <Link href="/admin/content" className="a-btn ghost small" style={{ textDecoration: "none" }}>Content</Link>
            <Link href="/admin/signature" className="a-btn ghost small" style={{ textDecoration: "none" }}>Signature</Link>
          </span>
        }
      />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 26 }}>
        <div className="a-card kpi"><div className="lab">Agents in flight</div><div className="val">{(agents ?? []).length}</div><div className="a-dimtxt" style={{ fontSize: 12 }}>of a 50-agent 2030 target</div></div>
        <div className="a-card kpi hot"><div className="lab">Awaiting {myRoleLabel ?? "leadership"}</div><div className="val">{queue.length}</div><div className="a-dimtxt" style={{ fontSize: 12 }}>tasks, verifications, gate sign-offs</div></div>
        <div className="a-card kpi"><div className="lab">Launched</div><div className="val">{launched}</div><div className="a-dimtxt" style={{ fontSize: 12 }}>past the Day-8 gate</div></div>
        <div className="a-card kpi"><div className="lab">Needs action</div><div className="val" style={{ color: atRisk ? "var(--a-crit)" : "var(--a-good)" }}>{atRisk}</div><div className="a-dimtxt" style={{ fontSize: 12 }}>agents with a critical flag</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 22, alignItems: "start" }} className="admin-cols">
        <div>
          {/* Queue */}
          <div className="a-card panel">
            <h3>Your queue{myRoleLabel ? ` — ${myRoleLabel}` : ""}</h3>
            {queue.length === 0 && <div className="a-empty">Queue is clear. Nothing waiting on you today.</div>}
            {queue.map((q, i) => {
              if (q.kind === "gate") {
                const clear = clearGate.bind(null, q.agent.id, q.gateKey);
                return (
                  <div key={i} className="queue-row">
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13.5 }}>{q.agent.full_name}</div>
                      <div className="a-muted" style={{ fontSize: 13 }}>{gateByKey(q.gateKey).name} — all criteria met, ready for your sign-off</div>
                    </div>
                    <form action={clear} style={{ marginLeft: "auto" }}>
                      <button className="a-btn small solid">Clear gate</button>
                    </form>
                  </div>
                );
              }
              if (q.kind === "verify") {
                const approve = verifyTask.bind(null, q.t.id, true);
                return (
                  <div key={i} className="queue-row">
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13.5 }}>{q.agent.full_name}</div>
                      <div className="a-muted" style={{ fontSize: 13 }}>
                        Verify: {q.t.task.title}{q.t.score != null ? ` · score ${q.t.score}` : ""}
                      </div>
                    </div>
                    <form action={approve} style={{ marginLeft: "auto" }}>
                      <button className="a-btn small good">Verify ✓</button>
                    </form>
                  </div>
                );
              }
              const markDone = verifyTask.bind(null, q.t.id, true);
              return (
                <div key={i} className="queue-row">
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13.5 }}>
                      {q.agent.full_name} {q.over && <span className="duetag over" style={{ marginLeft: 6 }}>OVERDUE</span>}
                    </div>
                    <div className="a-muted" style={{ fontSize: 13 }}>
                      {q.t.task.title} · {q.t.task.due_day != null && q.t.task.due_day <= 0 ? `Day −${Math.abs(q.t.task.due_day)}` : `Day ${q.t.task.due_day}`}
                    </div>
                  </div>
                  <form action={markDone} style={{ marginLeft: "auto" }}>
                    <button className="a-btn small">Done ✓</button>
                  </form>
                </div>
              );
            })}
          </div>

          {/* Roster */}
          <div className="section-title"><h2>Roster</h2><div className="rule" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}>
            {((agents ?? []) as AgentRow[]).map((a) => {
              const ctx = ctxOf.get(a.id)!;
              const d = dayOf(ctx.startDate);
              const fl = insights(ctx);
              const crit = fl.filter((f) => f.sev === "crit").length;
              const warn = fl.filter((f) => f.sev === "warn").length;
              const phase = currentStage(ctx, stageList);
              return (
                <div key={a.id} className="a-card agent-card">
                  <Link href={`/admin/agent/${a.id}`} style={{ display: "flex", gap: 14, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                    <Ring pct={progressOf(ctx)} size={44} label={`${progressOf(ctx)}%`} />
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>{a.full_name}</div>
                      <div className="a-muted" style={{ fontSize: 12 }}>
                        {d < 1 ? `T−${1 - d} · Pre-Flight` : `Day ${d} · ${phase?.title ?? ""}`}
                      </div>
                    </div>
                  </Link>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {gateCleared(ctx, "g8") ? <span className="pill good">Launched</span> : gateCleared(ctx, "g0") ? <span className="pill info">In training</span> : <span className="pill warn">Pre-flight</span>}
                    {crit > 0 && <span className="pill crit">{crit} critical</span>}
                    {warn > 0 && <span className="pill warn">{warn} watch</span>}
                    {crit === 0 && warn === 0 && <span className="pill good">On track</span>}
                    <span style={{ marginLeft: "auto" }}><DeleteAgentButton agentId={a.id} name={a.full_name} /></span>
                  </div>
                  {/* Gate banners surface here only when ready or at day */}
                  {!gateCleared(ctx, "g0") && gateReady(ctx, "g0") && (
                    <GateBanner ctx={ctx} gate={gateByKey("g0")} action={
                      <form action={clearGate.bind(null, a.id, "g0")}><button className="a-btn small solid">Sign off — clear Gate 0</button></form>
                    } />
                  )}
                  {gateCleared(ctx, "g0") && !gateCleared(ctx, "g8") && gateReady(ctx, "g8") && (
                    <GateBanner ctx={ctx} gate={gateByKey("g8")} action={
                      <form action={clearGate.bind(null, a.id, "g8")}><button className="a-btn small solid">Sign off — clear for launch</button></form>
                    } />
                  )}
                </div>
              );
            })}
            {(agents ?? []).length === 0 && <div className="a-empty">No agents yet — open the first flight below.</div>}
          </div>

          {/* Add agent */}
          <div className="section-title"><h2>Open a flight</h2><div className="rule" /></div>
          <div className="a-card panel" style={{ maxWidth: 480 }}>
            <form action={createAgent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input name="full_name" required placeholder="Full name" className="a-input" />
              <input name="email" type="email" required placeholder="TMT email" className="a-input" />
              <label className="a-dimtxt" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>
                Start date (Day 1)
                <input name="start_date" type="date" className="a-input" style={{ marginTop: 6 }} />
              </label>
              <select name="license" className="a-input">
                <option value="transferring">Transferring license</option>
                <option value="newly_licensed">Newly licensed</option>
              </select>
              <div style={{ display: "flex", gap: 16, fontSize: 13 }} className="a-muted">
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="ga" /> GA</label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="sc" /> SC</label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="is_new" /> New agent</label>
              </div>
              <button className="a-btn solid">Open flight — build checklist</button>
            </form>
          </div>
        </div>

        {/* Insight feed */}
        <div className="a-card panel">
          <h3>Insight feed — shortcomings & opportunities</h3>
          {allFlags.length === 0 && <div className="a-empty">No flags. Either everything is perfect or nobody is logging — check which.</div>}
          <FlagList flags={allFlags.slice(0, 14).map((f) => ({ ...f, text: `${f.agent} — ${f.text}` }))} max={14} />
          <p className="a-dimtxt" style={{ fontSize: 12, marginTop: 4 }}>
            Computed live from task, gate, and metric data: overdue items by owner, gate slip forecasts,
            role-play averages under 8, conversation pace under the 50/week floor, and early-launch opportunities.
          </p>
        </div>
      </div>

      {/* Team access — promote leadership logins; agents in onboarding stay agents */}
      <div className="section-title"><h2>Team access</h2><div className="rule" /></div>
      <div className="a-card panel" style={{ maxWidth: 640 }}>
        {(profiles ?? []).map((p) => {
          const role = (roleRows ?? []).find((r) => r.email && p.email && r.email.toLowerCase() === p.email.toLowerCase());
          const isOnboardingAgent = ((agents ?? []) as AgentRow[]).some((a) => a.email?.toLowerCase() === p.email?.toLowerCase());
          return (
            <div key={p.id} className="queue-row">
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13.5 }}>
                  {p.full_name ?? p.email}
                  {role && <span className="chip" style={{ marginLeft: 8, color: "var(--a-gold-hi)" }}>{ROLE_LABEL[role.role_key]}</span>}
                </div>
                <div className="a-muted" style={{ fontSize: 12.5 }}>{p.email}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                {p.role === "admin" ? (
                  <span className="pill good">Admin</span>
                ) : isOnboardingAgent ? (
                  <span className="pill info">Agent</span>
                ) : (
                  <form action={promoteAdmin.bind(null, p.id)}>
                    <button className="a-btn small">Promote to admin</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {(profiles ?? []).length === 0 && <div className="a-empty">No logins yet.</div>}
        <p className="a-dimtxt" style={{ fontSize: 12, marginTop: 10 }}>
          Teammates appear here after their first Google sign-in. Promoting links their login to their role —
          their queue (verifications, gate sign-offs) routes automatically from there.
        </p>
      </div>
    </main>
  );
}

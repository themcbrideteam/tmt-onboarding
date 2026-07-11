import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import TaskItem from "./task-item";
import MetricTap from "./metric-tap";
import { Topbar, Ring, Trajectory, FlagList, GateBanner } from "@/components/ascent";
import {
  buildCtx, dayOf, insights, progressOf, stageLocked, currentStage,
  gateByKey, gateCleared, isDone, Stage, TaskRow,
} from "@/lib/journey";

export default async function AgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role === "admin") redirect("/admin");

  await supabase.rpc("claim_agent");
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (!agent) {
    return (
      <main className="a-wrap">
        <Topbar sub="Agent flight deck" />
        <div className="a-card panel" style={{ maxWidth: 560 }}>
          <p className="a-muted" style={{ fontSize: 14 }}>
            Your flight hasn&apos;t been opened yet. A manager will add you shortly — check back soon.
          </p>
        </div>
      </main>
    );
  }

  const [{ data: stages }, { data: items }, { data: metricRows }, { data: rp }, { data: gateRows }] =
    await Promise.all([
      supabase.from("stages").select("*").order("sort_order"),
      supabase.from("agent_tasks").select("*, task:tasks(*)").eq("agent_id", agent.id),
      supabase.from("agent_metric_totals").select("*").eq("agent_id", agent.id),
      supabase.from("roleplay_attempts").select("score").eq("agent_id", agent.id),
      supabase.from("agent_gates").select("gate_key, cleared_at, cleared_by").eq("agent_id", agent.id),
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
  const flags = insights(ctx).filter((f) => f.role === "agent" || f.sev === "crit" || f.sev === "good");
  const nextGate = !gateCleared(ctx, "g0") ? "g0" : !gateCleared(ctx, "g8") ? "g8" : d <= 30 ? "g30" : "g60";
  const conv = ctx.metrics["conversation"] ?? { total: 0, last7d: 0 };
  const launched = gateCleared(ctx, "g8");

  const byStage = (stageId: string) =>
    tasks
      .filter((i) => i.task.stage_id === stageId)
      .sort((a, b) => (a.task.due_day ?? 0) - (b.task.due_day ?? 0) || a.task.sort_order - b.task.sort_order);

  const upNext = tasks
    .filter((t) => (t.task.owner_role ?? "agent") === "agent" && !isDone(t) && t.status !== "submitted")
    .filter((t) => {
      const st = stageList.find((s) => s.id === t.task.stage_id);
      return st && !stageLocked(ctx, st, stageList);
    })
    .sort((a, b) => (a.task.due_day ?? 99) - (b.task.due_day ?? 99))
    .slice(0, 3);

  return (
    <main className="a-wrap">
      <Topbar
        sub="Agent flight deck"
        right={<Link href="/agent/library" className="a-btn ghost small" style={{ textDecoration: "none" }}>Library</Link>}
      />

      <div className="a-card hero">
        <div>
          <div className="eyebrow">{agent.full_name} · {phase?.title ?? ""}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
            <span className="dayno">{d < 1 ? <em>T−{1 - d}</em> : <>Day <em>{d}</em></>}</span>
            <span className="a-muted" style={{ fontSize: 15 }}>
              {d < 1 ? "until Day 1 — Pre-Flight in progress" : `of your ascent · next: ${gateByKey(nextGate).name}`}
            </span>
          </div>
          <Trajectory ctx={ctx} />
        </div>
        <div className="ring-float">
          <Ring pct={progressOf(ctx)} label={`${progressOf(ctx)}%`} subLabel="complete" />
        </div>
      </div>

      <FlagList flags={flags} max={4} />

      {/* Conversations — Launch Gate criterion, then the weekly floor */}
      <div className="a-card panel" style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--a-gold)" }}>
            Conversations
          </h3>
          <div className="a-num" style={{ fontFamily: "var(--font-heading)", fontSize: 34, fontWeight: 700 }}>
            {launched ? conv.last7d : conv.total}
            <span className="a-muted" style={{ fontSize: 14, fontWeight: 500 }}>
              {" "}{launched ? "this week / 50 floor" : "attempts / 50 to launch"}
            </span>
          </div>
        </div>
        <MetricTap agentId={agent.id} metricKey="conversation" steps={[1, 5]} />
      </div>

      {upNext.length > 0 && (
        <div className="a-card panel" style={{ marginBottom: 30 }}>
          <h3>Up next — highest leverage first</h3>
          {upNext.map((item) => (
            <TaskItem key={item.id} item={item as never} locked={false} agentId={agent.id} currentDay={d} />
          ))}
        </div>
      )}

      {stageList.map((s, idx) => {
        const lock = stageLocked(ctx, s, stageList);
        const stageTasks = byStage(s.id);
        if (!stageTasks.length && !s.gate_key) return null;
        const doneCount = stageTasks.filter(isDone).length;
        const pct = stageTasks.length ? Math.round((100 * doneCount) / stageTasks.length) : 0;
        const here = d >= (s.day_from ?? -99) && d <= (s.day_to ?? 999);
        return (
          <section key={s.id} className={`phase ${lock ? "locked" : ""}`} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className="phase-head">
              <h2>
                {s.title}
                {here && <span className="chip" style={{ color: "var(--a-gold-hi)", borderColor: "var(--line)", marginLeft: 10 }}>You are here</span>}
              </h2>
              <span className="range">{s.day_from != null ? `Day ${s.day_from < 0 ? "−" + Math.abs(s.day_from) : s.day_from} → ${s.day_to}` : ""}</span>
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
              <span className="range a-num">{pct}%</span>
            </div>
            {s.note && <p className="a-muted" style={{ margin: "0 0 12px", fontSize: 13.5, maxWidth: "70ch" }}>{s.note}</p>}
            {lock && (
              <div className="locknote">
                🔒 Locked until {gateByKey(lock).name.split("—")[0].trim()} clears — the path is visible, the work waits.
              </div>
            )}
            {stageTasks.map((item) => (
              <TaskItem key={item.id} item={item as never} locked={!!lock} agentId={agent.id} currentDay={d} />
            ))}
            {s.gate_key && <GateBanner ctx={ctx} gate={gateByKey(s.gate_key)} />}
          </section>
        );
      })}

      <p className="a-dimtxt" style={{ fontSize: 13, fontStyle: "italic", marginTop: 40 }}>Guiding you home.</p>
    </main>
  );
}

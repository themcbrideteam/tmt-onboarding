// Noah's weekly one-pager — Mondays 8:30 AM Eastern (12:30 UTC).
// The system's own scoreboard: agents in flight, launches, ramp health, and
// the cohort metrics that tell you whether onboarding itself is improving.
import { createAdminClient, loadAllContexts, postSlack } from "../../src/lib/ops";
import { dayOf, insights, gateCleared } from "../../src/lib/journey";

export default async () => {
  if (!process.env.SLACK_WEBHOOK_URL) return new Response("slack not configured");
  const sb = createAdminClient();
  const { agents, ctxOf } = await loadAllContexts(sb);
  const active = agents.filter((a) => a.status === "onboarding" || a.status === "leads_active");

  const launched = active.filter((a) => gateCleared(ctxOf.get(a.id)!, "g8"));
  const inTraining = active.filter((a) => !gateCleared(ctxOf.get(a.id)!, "g8"));

  // Cohort metric: days from start to launch, for everyone who has launched.
  const { data: g8rows } = await sb.from("agent_gates").select("agent_id, cleared_at").eq("gate_key", "g8");
  const daysToLaunch: number[] = [];
  for (const r of g8rows ?? []) {
    const a = agents.find((x) => x.id === r.agent_id);
    if (a?.start_date) {
      daysToLaunch.push(Math.round((new Date(r.cleared_at).getTime() - new Date(a.start_date + "T00:00:00").getTime()) / 86400000) + 1);
    }
  }
  const avgLaunch = daysToLaunch.length ? (daysToLaunch.reduce((x, y) => x + y, 0) / daysToLaunch.length).toFixed(1) : "—";

  const lines: string[] = [
    `*Onboarding one-pager — week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}*`,
    `In flight: *${active.length}* · Launched: *${launched.length}* · Avg days to launch: *${avgLaunch}* (target: 8)`,
  ];

  if (inTraining.length) {
    lines.push(`\n*In training:*`);
    for (const a of inTraining) {
      const ctx = ctxOf.get(a.id)!;
      const d = dayOf(ctx.startDate);
      const crit = insights(ctx).filter((f) => f.sev === "crit").length;
      lines.push(`  • ${a.full_name} — ${d < 1 ? `starts in ${1 - d}d` : `Day ${d}`}, rp avg ${ctx.roleplay.avg ? ctx.roleplay.avg.toFixed(1) : "—"} (${ctx.roleplay.count}/15), ${ctx.metrics["conversation"]?.total ?? 0}/50 conversations${crit ? ` — 🔴 ${crit} critical` : ""}`);
    }
  }

  if (launched.length) {
    lines.push(`\n*In production (50/week floor):*`);
    for (const a of launched) {
      const ctx = ctxOf.get(a.id)!;
      const wk = ctx.metrics["conversation"]?.last7d ?? 0;
      const pend = ctx.tasks.find((t) => t.task.key === "first_pending")?.status === "verified";
      const close = ctx.tasks.find((t) => t.task.key === "first_closing")?.status === "verified";
      lines.push(`  • ${a.full_name} — Day ${dayOf(ctx.startDate)}, ${wk}/50 conversations ${wk >= 50 ? "✅" : "⚠️"}${close ? " · first closing ✓" : pend ? " · pending ✓" : ""}`);
    }
  }

  await postSlack(lines.join("\n"));
  return new Response("one-pager sent");
};

export const config = { schedule: "30 12 * * 1" };

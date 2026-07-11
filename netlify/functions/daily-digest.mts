// Morning digest — weekdays 8:00 AM Eastern (12:00 UTC).
// Gates at risk, overdue items by owner, verifications waiting. Posts to the
// Slack onboarding channel; silent no-op if SLACK_WEBHOOK_URL is unset.
import { createAdminClient, loadAllContexts, postSlack } from "../../src/lib/ops";
import { dayOf, insights, gateCleared, gateReady, GATES, ROLE_LABEL } from "../../src/lib/journey";

export default async () => {
  if (!process.env.SLACK_WEBHOOK_URL) return new Response("slack not configured");
  const sb = createAdminClient();
  const { agents, ctxOf } = await loadAllContexts(sb);
  const active = agents.filter((a) => a.status === "onboarding" || a.status === "leads_active");
  if (!active.length) return new Response("no active agents");

  const lines: string[] = [`*Onboarding digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}*`];
  let actionable = 0;

  for (const a of active) {
    const ctx = ctxOf.get(a.id)!;
    const d = dayOf(ctx.startDate);
    const fl = insights(ctx).filter((f) => f.sev === "crit" || f.sev === "warn");
    const ready = GATES.filter((g) => !g.checkpoint && !gateCleared(ctx, g.key) && gateReady(ctx, g.key));

    lines.push(`\n*${a.full_name}* — ${d < 1 ? `T−${1 - d} (pre-flight)` : `Day ${d}`}`);
    for (const g of ready) {
      lines.push(`  🟢 ${g.name} is READY — ${ROLE_LABEL[g.verifierRole]} can sign off now.`);
      actionable++;
    }
    for (const f of fl.slice(0, 5)) {
      lines.push(`  ${f.sev === "crit" ? "🔴" : "🟠"} ${f.text} → ${ROLE_LABEL[f.role] ?? f.role}`);
      actionable++;
    }
    if (!ready.length && !fl.length) lines.push(`  ✅ On track.`);
  }

  if (!actionable) lines.push(`\nEverything on track — no action needed today.`);
  await postSlack(lines.join("\n"));
  return new Response(`digest sent (${actionable} actionable items)`);
};

export const config = { schedule: "0 12 * * 1-5" };

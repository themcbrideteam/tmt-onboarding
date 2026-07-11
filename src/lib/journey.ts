// ============================================================================
// ASCENT journey engine — day math, gate evaluation, insights.
// The checklist (Day −10 → Day 60) is the canonical standard.
// ============================================================================

export type Stage = {
  id: string;
  key: string;
  title: string;
  sort_order: number;
  day_from: number | null;
  day_to: number | null;
  note: string | null;
  gate_key: string | null;
};

export type TaskRow = {
  id: string; // agent_task id
  status: string;
  progress_count: number;
  score: number | null;
  task: {
    id: string;
    key: string;
    title: string;
    description: string | null;
    stage_id: string;
    type: string;
    owner_role: string | null;
    verifier: string;
    evidence: string;
    is_hard_gate: boolean;
    target_count: number | null;
    pass_threshold: number | null;
    content_url: string | null;
    content_state: string;
    due_day: number | null;
    links: { l: string; u: string }[] | null;
    recurring: boolean;
    sort_order: number;
  };
};

export type MetricTotals = Record<string, { total: number; last7d: number }>;
export type GateClearance = { gate_key: string; cleared_at: string; cleared_by: string | null };

export type AgentCtx = {
  startDate: string | null; // Day 1
  tasks: TaskRow[];
  metrics: MetricTotals;
  roleplay: { count: number; avg: number };
  gates: GateClearance[];
};

export const ROLE_LABEL: Record<string, string> = {
  agent: "Agent",
  broker: "Broker",
  sales_manager: "Sales Mgr",
  operations: "Operations",
  transactions: "Transactions",
  marketing: "Marketing",
};

export const ROLE_COLOR: Record<string, string> = {
  agent: "#F4F3FC",
  broker: "#D9C48D",
  sales_manager: "#8FB7E8",
  operations: "#7FD8B8",
  transactions: "#C79BE8",
  marketing: "#E89BB8",
};

// ---------- day math ----------
export function dayOf(startDate: string | null): number {
  if (!startDate) return -10;
  const start = new Date(startDate + "T00:00:00").getTime();
  return Math.floor((Date.now() - start) / 86400000) + 1;
}

export function fmtDue(d: number | null): string {
  if (d == null) return "";
  return d <= 0 ? `Day ${d === 0 ? "0" : "−" + Math.abs(d)}` : `Day ${d}`;
}

// ---------- task helpers ----------
export const isDone = (t: TaskRow) => t.status === "verified";
export const isSubmitted = (t: TaskRow) => t.status === "submitted";
const byKey = (ctx: AgentCtx, key: string) => ctx.tasks.find((t) => t.task.key === key);

/** All listed tasks that exist for this agent are verified (missing = not applicable). */
function tasksMet(ctx: AgentCtx, keys: string[]): boolean {
  const present = keys.map((k) => byKey(ctx, k)).filter(Boolean) as TaskRow[];
  return present.length > 0 && present.every(isDone);
}

// ---------- gates ----------
export type Criterion = {
  label: string;
  taskKeys?: string[];
  metric?: (ctx: AgentCtx) => { met: boolean; detail?: string };
};

export type Gate = {
  key: string;
  name: string;
  day: number;
  verifierRole: string;
  sub: string;
  checkpoint?: boolean;
  criteria: Criterion[];
};

export const GATES: Gate[] = [
  {
    key: "g0",
    name: "Gate 0 — Cleared for Start",
    day: 0,
    verifierRole: "sales_manager",
    sub: "Tiffany verifies: paperwork signed, license active, systems live, pre-reading done. Not complete = the start date moves.",
    criteria: [
      { label: "All paperwork signed", taskKeys: ["ica", "performance", "w9", "direct_deposit", "voided_check", "drivers_license"] },
      { label: "License active with the brokerage", taskKeys: ["grec", "license_transfer", "sponsoring_broker"] },
      { label: "Systems live — email, FUB, Slack, Dotloop", taskKeys: ["tmt_email", "add_fub", "add_slack", "add_dotloop"] },
      { label: "Pre-reading + pre-work done", taskKeys: ["nar_ethics", "read_ewts", "db_jogger"] },
    ],
  },
  {
    key: "g8",
    name: "Launch Gate",
    day: 8,
    verifierRole: "sales_manager",
    sub: "Tiffany signs off on all seven before leads turn on. Scorecard clears early = launch early. Not cleared = launch waits, gap named specifically.",
    criteria: [
      {
        label: "15 MaverickRE role plays at an 8/10+ average",
        metric: (c) => ({
          met: c.roleplay.count >= 15 && c.roleplay.avg >= 8,
          detail: `${c.roleplay.count}/15 · avg ${c.roleplay.avg ? c.roleplay.avg.toFixed(1) : "—"}`,
        }),
      },
      { label: "Mock buyer consult passed with Noah", taskKeys: ["mock_consult"] },
      { label: "Practice offers Riley-approved", taskKeys: ["practice_offers_review"] },
      { label: "3 mock CMAs complete", taskKeys: ["mock_cmas"] },
      { label: "FUB workflow demonstrated live", taskKeys: ["fub_demo"] },
      {
        label: "Sphere loaded + 50 conversation attempts",
        metric: (c) => {
          const conv = c.metrics["conversation"]?.total ?? 0;
          const loaded = tasksMet(c, ["db_jogger_fub"]);
          return { met: loaded && conv >= 50, detail: `${conv}/50 attempts` };
        },
      },
      { label: "ZHL products articulated correctly", taskKeys: ["zhl_articulation"] },
    ],
  },
  {
    key: "g30",
    name: "Day 30 Review",
    day: 30,
    verifierRole: "sales_manager",
    checkpoint: true,
    sub: "First pending expected — or a documented action plan, reviewed with Tiffany.",
    criteria: [{ label: "First pending in the pipeline (or action plan on file)", taskKeys: ["first_pending"] }],
  },
  {
    key: "g60",
    name: "Day 60 Review",
    day: 60,
    verifierRole: "broker",
    checkpoint: true,
    sub: "Noah + Tiffany: first closing expected, or an escalated action plan.",
    criteria: [{ label: "First closing (or escalated action plan)", taskKeys: ["first_closing"] }],
  },
];

export function critMet(ctx: AgentCtx, c: Criterion): { met: boolean; detail?: string } {
  if (c.metric) return c.metric(ctx);
  return { met: tasksMet(ctx, c.taskKeys ?? []) };
}

export const gateByKey = (key: string) => GATES.find((g) => g.key === key)!;
export const gateReady = (ctx: AgentCtx, key: string) => gateByKey(key).criteria.every((c) => critMet(ctx, c).met);
export const gateCleared = (ctx: AgentCtx, key: string) => ctx.gates.some((g) => g.gate_key === key);

/** Stage locking: everything after Pre-Flight waits on g0; wheels onward waits on g8. */
export function stageLocked(ctx: AgentCtx, stage: Stage, stages: Stage[]): string | null {
  const idx = stages.findIndex((s) => s.key === stage.key);
  const preIdx = stages.findIndex((s) => s.key === "pre");
  const wheelsIdx = stages.findIndex((s) => s.key === "wheels");
  if (idx > preIdx && !gateCleared(ctx, "g0")) return "g0";
  if (wheelsIdx >= 0 && idx >= wheelsIdx && !gateCleared(ctx, "g8")) return "g8";
  return null;
}

export function progressOf(ctx: AgentCtx): number {
  if (!ctx.tasks.length) return 0;
  const done = ctx.tasks.filter((t) => isDone(t)).length;
  return Math.round((100 * done) / ctx.tasks.length);
}

export function currentStage(ctx: AgentCtx, stages: Stage[]): Stage | undefined {
  const d = dayOf(ctx.startDate);
  return stages.find((s) => d <= (s.day_to ?? 999)) ?? stages[stages.length - 1];
}

// ---------- insights (deterministic rules engine) ----------
export type Flag = { sev: "crit" | "warn" | "info" | "good"; text: string; role: string };

export function insights(ctx: AgentCtx): Flag[] {
  const d = dayOf(ctx.startDate);
  const out: Flag[] = [];
  const ica = byKey(ctx, "ica");

  if (ica && !isDone(ica) && !isSubmitted(ica) && d >= -9)
    out.push({ sev: "crit", text: `ICA unsigned — nothing proceeds. Start date is ${Math.max(0, 1 - d)} day(s) out.`, role: "broker" });

  if (!gateCleared(ctx, "g0") && d >= -2 && d < 1 && !gateReady(ctx, "g0"))
    out.push({ sev: "crit", text: "Gate 0 not clear with the start date inside 48 hours — start date moves unless the gaps close.", role: "sales_manager" });

  // Overdue, attributed to the owner role
  for (const t of ctx.tasks) {
    if (isDone(t) || isSubmitted(t) || t.task.recurring || t.task.due_day == null) continue;
    if (t.task.due_day < d) {
      out.push({
        sev: t.task.is_hard_gate ? "crit" : "warn",
        text: `Overdue: “${t.task.title}” (${fmtDue(t.task.due_day)}) — ${ROLE_LABEL[t.task.owner_role ?? "agent"]}.`,
        role: t.task.owner_role ?? "agent",
      });
    }
  }

  if (ctx.roleplay.count >= 6 && ctx.roleplay.avg < 8 && !gateCleared(ctx, "g8"))
    out.push({
      sev: "warn",
      text: `Role-play average ${ctx.roleplay.avg.toFixed(1)} across ${ctx.roleplay.count} sessions — the Launch Gate needs 8.0+. Drill the weakest script in the next 1:1.`,
      role: "sales_manager",
    });

  if (!gateCleared(ctx, "g8") && d >= 6 && d <= 8) {
    const unmet = gateByKey("g8").criteria.filter((c) => !critMet(ctx, c).met).length;
    if (unmet > 0)
      out.push({ sev: "warn", text: `Launch Gate in ${Math.max(0, 8 - d)} day(s) with ${unmet} of 7 criteria open — slip risk. Name the gap now.`, role: "sales_manager" });
  }

  const conv7 = ctx.metrics["conversation"]?.last7d ?? 0;
  const convTotal = ctx.metrics["conversation"]?.total ?? 0;
  if (gateCleared(ctx, "g8") && conv7 < 50)
    out.push({ sev: "warn", text: `Conversation pace ${conv7}/week — below the 50 floor.`, role: "sales_manager" });
  if (!gateCleared(ctx, "g8") && d >= 3 && tasksMet(ctx, ["db_jogger_fub"]) && convTotal < Math.min(50, d * 8))
    out.push({
      sev: "info",
      text: `${convTotal} of 50 conversation attempts logged — needs ~${Math.ceil((50 - convTotal) / Math.max(1, 8 - d))} per day to clear the gate on time.`,
      role: "agent",
    });

  const shadows = byKey(ctx, "shadow_12");
  if (shadows && d > 10 && d <= 15 && shadows.progress_count < 12)
    out.push({ sev: "info", text: `${shadows.progress_count} of 12 shadows — ${12 - shadows.progress_count} to go by Day 15.`, role: "sales_manager" });

  const pending = byKey(ctx, "first_pending");
  if (pending && d >= 25 && d <= 35 && !isDone(pending))
    out.push({ sev: "warn", text: "Day 30 approaching with no pending — expect a documented action plan at the review.", role: "sales_manager" });

  for (const t of ctx.tasks) {
    if (isSubmitted(t) && t.task.verifier === "admin")
      out.push({ sev: "info", text: `Awaiting verification: “${t.task.title}.”`, role: t.task.owner_role && t.task.owner_role !== "agent" ? t.task.owner_role : "sales_manager" });
  }

  if (!gateCleared(ctx, "g8") && gateCleared(ctx, "g0") && d < 8 && gateReady(ctx, "g8"))
    out.push({ sev: "good", text: "All seven Launch Gate criteria clear — scorecard clears early, launch early.", role: "sales_manager" });
  if (gateCleared(ctx, "g8") && conv7 >= 50)
    out.push({ sev: "good", text: `In production and above the floor: ${conv7} conversations this week.`, role: "agent" });

  return out;
}

// ---------- context builder (from raw Supabase rows) ----------
export function buildCtx(args: {
  startDate: string | null;
  tasks: TaskRow[];
  metricRows: { key: string; total: number; last_7d: number }[] | null;
  roleplayScores: number[] | null;
  gateRows: GateClearance[] | null;
}): AgentCtx {
  const metrics: MetricTotals = {};
  for (const m of args.metricRows ?? []) metrics[m.key] = { total: Number(m.total), last7d: Number(m.last_7d ?? 0) };
  const scores = args.roleplayScores ?? [];
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return {
    startDate: args.startDate,
    tasks: args.tasks,
    metrics,
    roleplay: { count: scores.length, avg },
    gates: args.gateRows ?? [],
  };
}

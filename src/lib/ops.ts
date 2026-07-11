// Shared helpers for scheduled automations (Netlify functions). These run
// outside a user session, so they use the service-role key.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AgentCtx, buildCtx, TaskRow } from "./journey";

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function postSlack(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.ok;
}

export type AgentRecord = {
  id: string;
  full_name: string;
  email: string;
  start_date: string | null;
  status: string;
};

export async function loadAllContexts(sb: SupabaseClient): Promise<{
  agents: AgentRecord[];
  ctxOf: Map<string, AgentCtx>;
}> {
  const [{ data: agents }, { data: allTasks }, { data: allMetrics }, { data: allRp }, { data: allGates }] =
    await Promise.all([
      sb.from("agents").select("id, full_name, email, start_date, status"),
      sb.from("agent_tasks").select("*, task:tasks(*)"),
      sb.from("agent_metric_totals").select("*"),
      sb.from("roleplay_attempts").select("agent_id, score"),
      sb.from("agent_gates").select("agent_id, gate_key, cleared_at, cleared_by"),
    ]);

  const ctxOf = new Map<string, AgentCtx>();
  for (const a of (agents ?? []) as AgentRecord[]) {
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
  return { agents: (agents ?? []) as AgentRecord[], ctxOf };
}

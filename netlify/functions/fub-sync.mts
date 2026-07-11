// Nightly FUB conversation sync — 3:00 AM Eastern (07:00 UTC) daily.
// Counts yesterday's calls + text messages per agent in Follow Up Boss and
// writes them to metric_events (source: fub_sync), so the Launch Gate's
// 50-conversation criterion and the weekly floor measure themselves.
//
// Requires FUB_API_KEY. Agents are matched to FUB users by email — the agent's
// record in this app must use the same address as their FUB login.
// When enabled, also set NEXT_PUBLIC_FUB_SYNC=1 to hide manual tap buttons
// (avoids double counting).
import { createAdminClient, postSlack } from "../../src/lib/ops";

const FUB = "https://api.followupboss.com/v1";

async function fub(path: string): Promise<Record<string, unknown> | null> {
  const key = process.env.FUB_API_KEY!;
  const res = await fetch(`${FUB}${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function countSince(collection: "calls" | "textMessages", userId: number, sinceIso: string): Promise<number> {
  const data = await fub(`/${collection}?userId=${userId}&createdAfter=${encodeURIComponent(sinceIso)}&limit=1`);
  const meta = data?.["_metadata"] as { total?: number } | undefined;
  return meta?.total ?? 0;
}

export default async () => {
  if (!process.env.FUB_API_KEY) return new Response("fub not configured");
  const sb = createAdminClient();

  // FUB users, mapped by email
  const usersData = await fub("/users?limit=100");
  const users = (usersData?.["users"] as { id: number; email?: string }[] | undefined) ?? [];
  const byEmail = new Map(users.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u.id]));

  const { data: agents } = await sb
    .from("agents")
    .select("id, full_name, email, status")
    .in("status", ["onboarding", "leads_active"]);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const results: string[] = [];
  let synced = 0;

  for (const a of agents ?? []) {
    const fubId = byEmail.get((a.email ?? "").toLowerCase());
    if (!fubId) {
      results.push(`• ${a.full_name}: no FUB user matches ${a.email} — skipped`);
      continue;
    }
    const [calls, texts] = await Promise.all([
      countSince("calls", fubId, since),
      countSince("textMessages", fubId, since),
    ]);
    const delta = calls + texts;
    if (delta > 0) {
      await sb.from("metric_events").insert({ agent_id: a.id, key: "conversation", delta, source: "fub_sync" });
      synced++;
    }
    results.push(`• ${a.full_name}: ${calls} calls + ${texts} texts = ${delta}`);
  }

  if (results.length) {
    await postSlack(`*FUB nightly sync* (${synced} agent${synced === 1 ? "" : "s"} updated)\n${results.join("\n")}`);
  }
  return new Response(`synced ${synced} agents`);
};

export const config = { schedule: "0 7 * * *" };

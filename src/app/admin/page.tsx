import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAgent } from "@/app/actions";
import VerifyButton from "./verify-button";
import DeleteAgentButton from "./delete-agent-button";
import BrandHeader from "@/components/brand-header";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user!.id)
    .single();
  if (profile?.role !== "admin") redirect("/agent");

  const { data: agents } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
  const { data: gate } = await supabase.from("agent_gate_status").select("*");
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false });

  // Review queue: admin-verified tasks not yet verified.
  const { data: queue } = await supabase
    .from("agent_tasks")
    .select("id, status, score, evidence_url, agent:agents(full_name), task:tasks(title, verifier, evidence, content_url)")
    .in("status", ["submitted", "in_progress", "not_started"]);
  const reviewItems = (queue ?? []).filter(
    (q) => (q.task as any)?.verifier === "admin" && q.status !== "verified",
  );

  // Short-lived signed URLs for any uploaded evidence in the queue.
  const signed: Record<string, string> = {};
  await Promise.all(
    reviewItems
      .filter((q) => q.evidence_url)
      .map(async (q) => {
        const { data } = await supabase.storage.from("agent-files").createSignedUrl(q.evidence_url as string, 600);
        if (data?.signedUrl) signed[q.id] = data.signedUrl;
      }),
  );

  const gateFor = (agentId: string) => (gate ?? []).find((g) => g.agent_id === agentId);

  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle="Admin" maxWidth="max-w-5xl">
        <Link href="/admin/signature" className="hover:text-white">My signature</Link>
        <Link href="/admin/content" className="hover:text-white">Content links</Link>
        <form action="/auth/signout" method="post">
          <button className="hover:text-white">Sign out</button>
        </form>
      </BrandHeader>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {/* Alerts */}
          {(events ?? []).length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-semibold text-amber-800">Action needed</h2>
              <ul className="mt-2 space-y-1">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="text-sm text-amber-900">
                    ⚡ {e.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Roster */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-navy">Agents</h2>
            <div className="mt-3 space-y-2">
              {(agents ?? []).map((a) => {
                const g = gateFor(a.id);
                const total = g?.gate_total ?? 0;
                const done = g?.gate_done ?? 0;
                const cleared = g?.gate_cleared;
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                    <div>
                      <Link href={`/admin/agent/${a.id}`} className="text-sm font-medium text-navy hover:underline">
                        {a.full_name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {a.license === "transferring" ? "Transferring" : "Newly licensed"} ·{" "}
                        {(a.license_states ?? []).join("/") || "—"} {a.is_new ? "· new" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-xs font-medium ${cleared ? "text-gold" : "text-slate-600"}`}>
                          {cleared ? "Gate cleared ✓" : `Gate ${done}/${total}`}
                        </p>
                        <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full bg-navy" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <DeleteAgentButton agentId={a.id} name={a.full_name} />
                    </div>
                  </div>
                );
              })}
              {(agents ?? []).length === 0 && <p className="text-sm text-slate-500">No agents yet.</p>}
            </div>
          </section>

          {/* Review queue */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-navy">Review queue</h2>
            <p className="text-xs text-slate-500">Items needing a manager sign-off.</p>
            <div className="mt-3 space-y-2">
              {reviewItems.map((q) => (
                <div key={q.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <div>
                    <p className="text-sm text-navy">{(q.task as any)?.title}</p>
                    <p className="text-xs text-slate-500">
                      {(q.agent as any)?.full_name}
                      {q.score != null ? ` · score ${q.score}` : ""}
                      {(q.task as any)?.content_url && (
                        <>
                          {" · "}
                          <a href={(q.task as any).content_url} target="_blank" className="text-navy underline">
                            open link
                          </a>
                        </>
                      )}
                      {signed[q.id] && (
                        <>
                          {" · "}
                          <a href={signed[q.id]} target="_blank" className="text-navy underline">
                            view file
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <VerifyButton agentTaskId={q.id} />
                </div>
              ))}
              {reviewItems.length === 0 && <p className="text-sm text-slate-500">Nothing waiting. 🎉</p>}
            </div>
          </section>
        </div>

        {/* Add agent */}
        <aside>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-navy">Add an agent</h2>
            <form action={createAgent} className="mt-3 space-y-3">
              <input name="full_name" required placeholder="Full name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input name="email" type="email" required placeholder="TMT email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <label className="block text-xs text-slate-500">Start date
                <input name="start_date" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <select name="license" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="transferring">Transferring license</option>
                <option value="newly_licensed">Newly licensed</option>
              </select>
              <div className="flex gap-4 text-sm text-slate-700">
                <label className="flex items-center gap-1"><input type="checkbox" name="ga" /> GA</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="sc" /> SC</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="is_new" /> New agent</label>
              </div>
              <button className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light">
                Create & build checklist
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}

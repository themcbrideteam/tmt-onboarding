import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QUESTIONNAIRE } from "@/lib/questionnaire";
import BrandHeader from "@/components/brand-header";

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

  const { data: items } = await supabase
    .from("agent_tasks")
    .select("status, task:tasks(title, stage_id, sort_order, is_hard_gate)")
    .eq("agent_id", id);
  const { data: stages } = await supabase.from("stages").select("*").order("sort_order");
  const { data: qr } = await supabase
    .from("questionnaire_responses")
    .select("answers, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const answers = (qr?.answers ?? {}) as Record<string, string>;
  const done = (items ?? []).filter((i) => i.status === "verified").length;

  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle={agent.full_name} maxWidth="max-w-3xl">
        <Link href="/admin" className="hover:text-white">← Dashboard</Link>
      </BrandHeader>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p>{agent.email}</p>
          <p className="mt-1">
            {agent.license === "transferring" ? "Transferring" : "Newly licensed"} ·{" "}
            {(agent.license_states ?? []).join("/") || "—"} {agent.is_new ? "· new agent" : ""} ·{" "}
            {done}/{items?.length ?? 0} tasks done
          </p>
          <p className="mt-1 font-medium text-slate-800">
            Status: {agent.status === "leads_active" ? "Leads active" : "Onboarding"}
          </p>
        </section>

        {/* Task progress by stage */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Progress</h2>
          {(stages ?? []).map((s) => {
            const tasks = (items ?? [])
              .filter((i) => (i.task as any)?.stage_id === s.id)
              .sort((a, b) => ((a.task as any)?.sort_order ?? 0) - ((b.task as any)?.sort_order ?? 0));
            if (tasks.length === 0) return null;
            return (
              <div key={s.id} className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.title}</p>
                <ul className="mt-1 space-y-0.5">
                  {tasks.map((t, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {(t.task as any)?.title}
                        {(t.task as any)?.is_hard_gate && <span className="ml-1 text-amber-600">★</span>}
                      </span>
                      <span className={t.status === "verified" ? "text-gold" : "text-slate-400"}>
                        {t.status === "verified" ? "✓" : t.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Questionnaire answers */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-navy">Team Member Questionnaire</h2>
          {qr ? (
            <dl className="space-y-3">
              {QUESTIONNAIRE.map((item, i) => (
                <div key={item.id}>
                  <dt className="text-xs font-medium text-slate-500">
                    {i + 1}. {item.q}
                  </dt>
                  <dd className="text-sm text-slate-800">{answers[item.id] || <span className="text-slate-300">—</span>}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Not submitted yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

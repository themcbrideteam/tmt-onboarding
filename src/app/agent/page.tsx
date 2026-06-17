import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TaskItem from "./task-item";
import BrandHeader from "@/components/brand-header";

export default async function AgentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admins shouldn't see the agent view — send them to the dashboard.
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role === "admin") redirect("/admin");

  // Link this login to its onboarding record (by email) on first visit.
  await supabase.rpc("claim_agent");
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("profile_id", user!.id)
    .maybeSingle();

  if (!agent) {
    return (
      <Shell name={user?.email ?? ""}>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Your onboarding hasn&apos;t been set up yet. A manager will add you shortly.
        </div>
      </Shell>
    );
  }

  const { data: stages } = await supabase.from("stages").select("*").order("sort_order");
  const { data: items } = await supabase
    .from("agent_tasks")
    .select("*, task:tasks(*)")
    .eq("agent_id", agent.id);

  const byStage = (stageId: string) =>
    (items ?? [])
      .filter((i) => i.task?.stage_id === stageId)
      .sort((a, b) => (a.task?.sort_order ?? 0) - (b.task?.sort_order ?? 0));

  // Sequential unlock: a stage opens when the previous stage is fully verified.
  const stageList = stages ?? [];
  const completeFlags = stageList.map((s) => {
    const tasks = byStage(s.id);
    return tasks.length > 0 && tasks.every((t) => t.status === "verified");
  });

  const gateTotal = (items ?? []).filter((i) => i.task?.is_hard_gate).length;
  const gateDone = (items ?? []).filter((i) => i.task?.is_hard_gate && i.status === "verified").length;

  return (
    <Shell name={agent.full_name}>
      <div className="mb-6 rounded-xl bg-navy p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">Lead activation gate</p>
            <p className="text-lg font-semibold">
              {gateDone === gateTotal ? "Cleared — leads can be activated 🎉" : `${gateDone} of ${gateTotal} requirements done`}
            </p>
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-gold"
              style={{ width: `${gateTotal ? (gateDone / gateTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {stageList.map((s, idx) => {
          const locked = idx > 0 && !completeFlags[idx - 1];
          const tasks = byStage(s.id);
          if (tasks.length === 0) return null;
          return (
            <section key={s.id}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{s.title}</h2>
                {locked && <span className="text-xs text-slate-400">🔒 locked</span>}
                {completeFlags[idx] && <span className="text-xs text-gold">✓ complete</span>}
              </div>
              <div className="space-y-2">
                {tasks.map((item) => (
                  <TaskItem key={item.id} item={item} locked={locked} agentId={agent.id} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle={`Onboarding · ${name}`}>
        <form action="/auth/signout" method="post">
          <button className="hover:text-white">Sign out</button>
        </form>
      </BrandHeader>
      <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>
    </main>
  );
}

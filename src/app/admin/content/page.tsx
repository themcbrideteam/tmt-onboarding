import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { setContentUrl } from "@/app/actions";
import BrandHeader from "@/components/brand-header";

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect("/agent");

  const { data: stages } = await supabase.from("stages").select("*").order("sort_order");
  // Only tasks that can carry training content (videos, docs, acknowledgments).
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .in("type", ["video", "self", "ack", "sign", "doc"])
    .order("sort_order");

  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle="Content links" maxWidth="max-w-3xl">
        <Link href="/admin" className="hover:text-white">← Back to dashboard</Link>
      </BrandHeader>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500">
          Paste a Loom/doc URL for each item as you create it. Amber = still needs content.
        </p>
        {(stages ?? []).map((s) => {
          const stageTasks = (tasks ?? []).filter((t) => t.stage_id === s.id);
          if (stageTasks.length === 0) return null;
          return (
            <section key={s.id} className="mb-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.title}</h2>
              <div className="space-y-2">
                {stageTasks.map((t) => (
                  <form
                    key={t.id}
                    action={setContentUrl}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                  >
                    <input type="hidden" name="task_id" value={t.id} />
                    <span className="w-48 shrink-0 truncate text-sm text-slate-700" title={t.title}>
                      {t.title}
                    </span>
                    {t.content_state === "create" && !t.content_url && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">TBD</span>
                    )}
                    <input
                      name="content_url"
                      defaultValue={t.content_url ?? ""}
                      placeholder="https://loom.com/…"
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button className="rounded bg-navy px-3 py-1 text-xs text-white hover:bg-navy-light">Save</button>
                  </form>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

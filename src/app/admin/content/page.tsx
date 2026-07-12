import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { setContentUrl } from "@/app/actions";
import { Topbar } from "@/components/ascent";

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

  const missing = (tasks ?? []).filter((t) => t.content_state === "create" && !t.content_url).length;

  return (
    <main className="a-wrap">
      <Topbar
        sub="Content links"
        right={<Link href="/admin" className="a-btn ghost small" style={{ textDecoration: "none" }}>← Mission control</Link>}
      />
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <p className="a-muted" style={{ fontSize: 14, marginBottom: 20 }}>
          Paste a Loom or doc URL for each item as it&apos;s recorded.
          {missing > 0 && <span style={{ color: "var(--a-warn)" }}> {missing} item{missing === 1 ? "" : "s"} still need content.</span>}
        </p>
        {(stages ?? []).map((s) => {
          const stageTasks = (tasks ?? []).filter((t) => t.stage_id === s.id);
          if (stageTasks.length === 0) return null;
          return (
            <section key={s.id} style={{ marginBottom: 28 }}>
              <div className="section-title" style={{ margin: "0 0 12px" }}>
                <h2>{s.title}</h2>
                <div className="rule" />
              </div>
              {stageTasks.map((t) => (
                <form key={t.id} action={setContentUrl} className="queue-row" style={{ gap: 10 }}>
                  <input type="hidden" name="task_id" value={t.id} />
                  <span style={{ width: 210, flex: "none", fontSize: 13, fontFamily: "var(--font-heading)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.title}>
                    {t.title}
                  </span>
                  {t.content_state === "create" && !t.content_url && <span className="vbadge pending">TBD</span>}
                  <input
                    name="content_url"
                    defaultValue={t.content_url ?? ""}
                    placeholder="https://loom.com/…"
                    className="a-input"
                    style={{ flex: 1, padding: "7px 11px", fontSize: 12.5 }}
                  />
                  <button className="a-btn small">Save</button>
                </form>
              ))}
            </section>
          );
        })}
      </div>
    </main>
  );
}

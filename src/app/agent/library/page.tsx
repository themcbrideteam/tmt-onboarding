import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/ascent";
import { LIBRARY_SEED, LibraryEntry } from "@/lib/library";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tag?: string }>;
}) {
  const { id, tag } = await searchParams;
  const supabase = await createClient();

  // Merge admin-added items from the DB with the versioned seed.
  const { data: dbItems } = await supabase.from("library_items").select("*").order("created_at", { ascending: false });
  const extras: LibraryEntry[] = (dbItems ?? []).map((r) => ({
    id: r.id,
    type: (r.type ?? "link") as LibraryEntry["type"],
    title: r.title,
    desc: r.descr ?? "",
    tags: r.tags ?? [],
    url: r.url ?? undefined,
    body: r.body ?? undefined,
  }));
  const all = [...extras, ...LIBRARY_SEED];

  const entry = id ? all.find((e) => e.id === id) : null;
  if (entry) {
    return (
      <main className="a-wrap">
        <Topbar sub="Library" right={<Link href="/agent" className="a-btn ghost small" style={{ textDecoration: "none" }}>My journey</Link>} />
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <Link href="/agent/library" className="a-muted" style={{ fontSize: 12.5, textDecoration: "none" }}>← Library</Link>
          <div className="a-card" style={{ padding: "38px 44px", marginTop: 14 }}>
            <span className={`typechip ${entry.type}`}>{entry.type}</span>
            <h2 style={{ fontSize: 24, margin: "12px 0 6px" }}>{entry.title}</h2>
            <p className="a-muted" style={{ marginTop: 0 }}>{entry.desc}</p>
            {entry.url && (
              <p><a href={entry.url} target={entry.url.startsWith("/") ? undefined : "_blank"} rel="noopener" style={{ color: "var(--a-gold-hi)" }}>Open resource ↗</a></p>
            )}
            {entry.body && <div className="doc-body" dangerouslySetInnerHTML={{ __html: entry.body }} />}
          </div>
        </div>
      </main>
    );
  }

  const tags = [...new Set(all.flatMap((e) => e.tags))].sort();
  const list = tag ? all.filter((e) => e.tags.includes(tag)) : all;

  return (
    <main className="a-wrap">
      <Topbar sub="Library" right={<Link href="/agent" className="a-btn ghost small" style={{ textDecoration: "none" }}>My journey</Link>} />
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 22 }}>
        <Link href="/agent/library" className={`a-btn small ${!tag ? "" : "ghost"}`} style={{ textDecoration: "none" }}>All</Link>
        {tags.map((t) => (
          <Link key={t} href={`/agent/library?tag=${encodeURIComponent(t)}`} className={`a-btn small ${tag === t ? "" : "ghost"}`} style={{ textDecoration: "none" }}>
            {t}
          </Link>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {list.map((e) => (
          <Link key={e.id} href={`/agent/library?id=${e.id}`} className="a-card lib-card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className={`typechip ${e.type}`} style={{ alignSelf: "flex-start" }}>{e.type}</span>
            <h3 style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.35 }}>{e.title}</h3>
            <p className="a-muted" style={{ margin: 0, fontSize: 13 }}>{e.desc}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto", paddingTop: 8 }}>
              {e.tags.map((t) => (
                <span key={t} className="a-dimtxt" style={{ fontSize: 9.5, letterSpacing: ".11em", textTransform: "uppercase", border: "1px solid var(--edge)", borderRadius: 7, padding: "2.5px 9px" }}>
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      <p className="a-dimtxt" style={{ fontSize: 12.5, marginTop: 26 }}>
        The library grows as the team feeds it — leadership can add resources from the admin console.
      </p>
    </main>
  );
}

import Link from "next/link";
import { Topbar } from "@/components/ascent";

// Zillow Home Loans lender directory — agents call through these and build a
// personal relationship with two. Source: ZHL Lender Phone Numbers.
const LENDERS: { name: string; phone: string }[] = [
  { name: "Lisa LeGrande", phone: "913-845-9592" },
  { name: "Joseph Alfonso", phone: "206-229-8032" },
  { name: "Phuoc Nguyen", phone: "206-456-2402" },
  { name: "Anthony Vaughn", phone: "913-485-9073" },
  { name: "Marty Neils", phone: "425-584-3119" },
  { name: "Rob Morrison", phone: "949-325-8065" },
  { name: "Rob Salter", phone: "949-558-2544" },
  { name: "Melissa Rush", phone: "469-291-0881" },
  { name: "Kelly Root", phone: "816-519-8539" },
  { name: "Danny Jassen", phone: "425-529-5483" },
  { name: "Ben Decker", phone: "949-326-2661" },
  { name: "Ryan Stephenson", phone: "913-213-6633" },
  { name: "Jesse Kangas", phone: "913-213-6600" },
  { name: "Kade Lyons", phone: "425-381-2404" },
  { name: "Sade Burroughs", phone: "425-368-9579" },
];

export default function LendersPage() {
  return (
    <main className="a-wrap">
      <Topbar
        sub="ZHL lender directory"
        right={<Link href="/agent" className="a-btn ghost small" style={{ textDecoration: "none" }}>← My journey</Link>}
      />
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <p className="a-muted" style={{ fontSize: 14, marginBottom: 18, maxWidth: "60ch" }}>
          Call through these Zillow Home Loans lenders and build a personal relationship with at least two.
          When you&apos;ve connected with two, submit their names on your checklist — Noah confirms with the lenders.
        </p>
        <div className="a-card" style={{ padding: "10px 0", overflow: "hidden" }}>
          {LENDERS.map((l) => (
            <div
              key={l.name}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 22px", borderBottom: "1px solid var(--edge)", fontSize: 14 }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>{l.name}</span>
              <a href={`tel:${l.phone.replace(/[^0-9]/g, "")}`} className="tlink">
                {l.phone}
              </a>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

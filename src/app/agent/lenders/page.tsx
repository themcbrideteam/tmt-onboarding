import Link from "next/link";
import BrandHeader from "@/components/brand-header";

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
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle="Zillow Home Loans lenders" maxWidth="max-w-xl">
        <Link href="/agent" className="hover:text-white">← Back</Link>
      </BrandHeader>
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500">
          Call through these Zillow Home Loans lenders and build a personal relationship with at least two of them.
          When you&apos;ve connected with two, submit their names on your checklist — Noah will confirm with the lenders.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {LENDERS.map((l, i) => (
            <div
              key={l.name}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${i % 2 ? "bg-slate-50" : "bg-white"}`}
            >
              <span className="font-medium text-navy">{l.name}</span>
              <a href={`tel:${l.phone.replace(/[^0-9]/g, "")}`} className="text-navy underline">
                {l.phone}
              </a>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

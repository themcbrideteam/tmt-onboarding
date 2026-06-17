import Link from "next/link";
import ICAForm from "./ica-form";
import BrandHeader from "@/components/brand-header";

export default async function SignICAPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle="Independent Contractor Agreement" maxWidth="max-w-xl">
        <Link href="/agent" className="hover:text-white">← Back</Link>
      </BrandHeader>
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500">
          Please{" "}
          <a href="/forms/ica.pdf" target="_blank" className="text-navy underline">
            read the full agreement
          </a>
          , then sign below. We&apos;ll generate your executed copy and email it to you and bookkeeping.
        </p>
        {at ? (
          <ICAForm agentTaskId={at} />
        ) : (
          <p className="text-sm text-red-600">Missing task reference. Return to your checklist and try again.</p>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import W9Form from "./w9-form";
import BrandHeader from "@/components/brand-header";

export default async function SignW9Page({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle="Sign your W-9" maxWidth="max-w-xl">
        <Link href="/agent" className="hover:text-white">← Back</Link>
      </BrandHeader>
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500">
          We&apos;ll fill the official IRS Form W-9 with your details and signature, then send it to bookkeeping.
        </p>
        {at ? (
          <W9Form agentTaskId={at} />
        ) : (
          <p className="text-sm text-red-600">Missing task reference. Return to your checklist and try again.</p>
        )}
      </div>
    </main>
  );
}

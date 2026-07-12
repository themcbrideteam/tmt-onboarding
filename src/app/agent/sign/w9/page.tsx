import W9Form from "./w9-form";
import { PaperShell } from "@/components/ascent";

export default async function SignW9Page({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;

  return (
    <PaperShell
      sub="IRS Form W-9"
      backHref="/agent"
      intro="We fill the official IRS Form W-9 with your details and signature, then route it to bookkeeping automatically."
    >
      {at ? (
        <W9Form agentTaskId={at} />
      ) : (
        <p className="text-sm text-red-600">Missing task reference. Return to your checklist and try again.</p>
      )}
    </PaperShell>
  );
}

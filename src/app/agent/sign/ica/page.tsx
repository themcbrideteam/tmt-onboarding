import ICAForm from "./ica-form";
import { PaperShell } from "@/components/ascent";

export default async function SignICAPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;

  return (
    <PaperShell
      sub="Independent Contractor Agreement"
      backHref="/agent"
      intro={
        <>
          Read the{" "}
          <a href="/forms/ica.pdf" target="_blank" style={{ color: "var(--a-gold-hi)" }}>
            full agreement ↗
          </a>
          , then sign below. Your executed copy is generated instantly and emailed to you and bookkeeping —
          signing this opens the rest of your pre-flight checklist.
        </>
      }
    >
      {at ? (
        <ICAForm agentTaskId={at} />
      ) : (
        <p className="text-sm text-red-600">Missing task reference. Return to your checklist and try again.</p>
      )}
    </PaperShell>
  );
}

import Link from "next/link";
import { saveQuestionnaire } from "@/app/actions";
import { QUESTIONNAIRE, QUESTIONNAIRE_INTRO } from "@/lib/questionnaire";
import BrandHeader from "@/components/brand-header";

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle="Team Member Questionnaire" maxWidth="max-w-2xl">
        <Link href="/agent" className="hover:text-white">← Back</Link>
      </BrandHeader>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-6 text-base font-medium text-slate-800">{QUESTIONNAIRE_INTRO}</p>
        {at ? (
          <form action={saveQuestionnaire} className="space-y-4">
            <input type="hidden" name="agent_task_id" value={at} />
            {QUESTIONNAIRE.map((item, i) => (
              <div key={item.id}>
                <label className="text-sm font-medium text-slate-700">
                  {i + 1}. {item.q}
                </label>
                <textarea
                  name={item.id}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-light">
              Submit questionnaire
            </button>
          </form>
        ) : (
          <p className="text-sm text-red-600">Missing task reference. Return to your checklist and try again.</p>
        )}
      </div>
    </main>
  );
}

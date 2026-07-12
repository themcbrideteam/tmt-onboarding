import PerformanceForm from "./performance-form";
import { PaperShell } from "@/components/ascent";

export default async function SignPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;

  return (
    <PaperShell
      sub="Team Performance Standards Policy"
      backHref="/agent"
      maxWidth={680}
      intro="These standards are the conditions of receiving team-provided Zillow Preferred leads. Read the summary, then sign — your signed copy is emailed to you and the team."
    >
      <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <p><span className="font-semibold text-navy">Zillow Preferred standards (rolling, reviewed monthly):</span> Call Answer 80% · Appt Set 70% · Met With 45% · Show 30% · Offer 15% · Conversion 10%+ · ZHL Pre-Approval 10%.</p>
        <p><span className="font-semibold text-navy">CRM:</span> Follow Up Boss is the system of record — manage it daily, clear Smart Lists by EOD, log every communication, update lead stage in real time.</p>
        <p><span className="font-semibold text-navy">Attendance:</span> attend all 1:1s and the weekly meeting (max 4 absences / 12 mo with notice).</p>
        <p><span className="font-semibold text-navy">Minimum production:</span> 12 closed transactions / calendar year on team business.</p>
        <p><span className="font-semibold text-navy">Review process:</span> 1st offense — 1-week lead pause + skills 1:1; 2nd — 1-month pause + skills 1:1 + shadow 2 tours; 3rd — removal from the Zillow Preferred team.</p>
      </div>
      {at ? (
        <PerformanceForm agentTaskId={at} />
      ) : (
        <p className="text-sm text-red-600">Missing task reference. Return to your checklist and try again.</p>
      )}
    </PaperShell>
  );
}

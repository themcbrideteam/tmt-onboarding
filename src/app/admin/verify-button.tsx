"use client";

import { useTransition } from "react";
import { verifyTask } from "@/app/actions";

export default function VerifyButton({ agentTaskId }: { agentTaskId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      <button
        disabled={pending}
        onClick={() => start(() => verifyTask(agentTaskId, true))}
        className="rounded bg-gold px-2 py-1 text-xs font-medium text-white hover:bg-gold/100"
      >
        Verify
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => verifyTask(agentTaskId, false))}
        className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
      >
        Reject
      </button>
    </div>
  );
}

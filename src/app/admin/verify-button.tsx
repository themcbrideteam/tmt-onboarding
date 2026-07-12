"use client";

import { useTransition } from "react";
import { verifyTask } from "@/app/actions";

export default function VerifyButton({ agentTaskId }: { agentTaskId: string }) {
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        disabled={pending}
        onClick={() => start(() => verifyTask(agentTaskId, true))}
        className="a-btn small good"
      >
        Verify ✓
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => verifyTask(agentTaskId, false))}
        className="a-btn small ghost"
      >
        Reject
      </button>
    </div>
  );
}

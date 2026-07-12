"use client";

import { useTransition } from "react";
import { deleteAgent } from "@/app/actions";

export default function DeleteAgentButton({ agentId, name }: { agentId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `Remove ${name}?\n\nThis deletes their checklist and all progress (permanent). Their login stays, so you can re-add them with the same email to rebuild a fresh checklist.`,
          )
        ) {
          start(() => deleteAgent(agentId));
        }
      }}
      className="a-btn small ghost"
      style={{ color: "#F6ACB6", borderColor: "rgba(228,92,112,.3)" }}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

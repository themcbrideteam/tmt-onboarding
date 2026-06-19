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
      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

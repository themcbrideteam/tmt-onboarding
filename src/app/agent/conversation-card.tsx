"use client";

import { useOptimistic, useTransition } from "react";
import { logMetric } from "@/app/actions";

// Conversation counter with optimistic taps — the number moves the instant
// you tap. When FUB sync is on (NEXT_PUBLIC_FUB_SYNC=1), taps are hidden and
// the count fills itself from FUB overnight.
export default function ConversationCard({
  agentId,
  initial,
  label,
  showTaps,
}: {
  agentId: string;
  initial: number;
  label: string;
  showTaps: boolean;
}) {
  const [, start] = useTransition();
  const [count, add] = useOptimistic<number, number>(initial, (c, d) => c + d);

  return (
    <div className="a-card panel" style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--a-gold)" }}>
          Conversations
        </h3>
        <div className="a-num" style={{ fontFamily: "var(--font-heading)", fontSize: 34, fontWeight: 700 }}>
          {count}
          <span className="a-muted" style={{ fontSize: 14, fontWeight: 500 }}> {label}</span>
        </div>
        {!showTaps && (
          <p className="a-dimtxt" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Synced nightly from Follow Up Boss — no manual logging needed.
          </p>
        )}
      </div>
      {showTaps && (
        <span style={{ display: "inline-flex", gap: 8 }}>
          {[1, 5].map((n) => (
            <button
              key={n}
              className="a-btn small"
              onClick={() =>
                start(async () => {
                  add(n);
                  await logMetric(agentId, "conversation", n);
                })
              }
            >
              +{n}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

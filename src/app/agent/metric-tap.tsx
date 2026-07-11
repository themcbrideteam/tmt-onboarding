"use client";

import { useTransition } from "react";
import { logMetric } from "@/app/actions";

export default function MetricTap({
  agentId,
  metricKey,
  steps = [1, 5],
}: {
  agentId: string;
  metricKey: string;
  steps?: number[];
}) {
  const [pending, start] = useTransition();
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      {steps.map((n) => (
        <button
          key={n}
          className="a-btn small"
          disabled={pending}
          onClick={() => start(() => logMetric(agentId, metricKey, n))}
        >
          +{n}
        </button>
      ))}
    </span>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signPerformance } from "@/app/actions";
import SignaturePad, { type SignatureHandle } from "@/app/agent/sign/w9/signature-pad";

export default function PerformanceForm({ agentTaskId }: { agentTaskId: string }) {
  const sigRef = useRef<SignatureHandle>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function submit(formData: FormData) {
    const png = sigRef.current?.toPng();
    if (!png) {
      setError("Please sign in the box.");
      return;
    }
    formData.set("signature", png);
    formData.set("agent_task_id", agentTaskId);
    start(async () => {
      const res = await signPerformance(formData);
      if (res?.error) setError(res.error);
      else router.push("/agent");
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-600">Your full legal name</label>
        <input name="name" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Signature</label>
        <SignaturePad ref={sigRef} />
      </div>
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        I have read, understood, and agree to uphold the Team Performance Standards, and I understand these are
        conditions of receiving team-provided leads. I consent to sign electronically.
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Sign & submit"}
      </button>
    </form>
  );
}

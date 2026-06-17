"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signW9 } from "@/app/actions";
import SignaturePad, { type SignatureHandle } from "./signature-pad";

export default function W9Form({ agentTaskId }: { agentTaskId: string }) {
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
      const res = await signW9(formData);
      if (res?.error) setError(res.error);
      else router.push("/agent");
    });
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <form action={submit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-600">Name (as shown on your tax return)</label>
        <input name="name" required className={input} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Business name (if different — optional)</label>
        <input name="business" className={input} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Federal tax classification</label>
        <select name="classification" className={input} defaultValue="individual">
          <option value="individual">Individual / sole proprietor</option>
          <option value="llc">LLC</option>
          <option value="scorp">S Corporation</option>
          <option value="ccorp">C Corporation</option>
          <option value="partnership">Partnership</option>
          <option value="trust">Trust / estate</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Street address</label>
        <input name="address1" required className={input} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">City, state, ZIP</label>
        <input name="city_state_zip" required className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">SSN</label>
          <input name="ssn" placeholder="###-##-####" className={input} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">or EIN</label>
          <input name="ein" placeholder="##-#######" className={input} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Signature</label>
        <SignaturePad ref={sigRef} />
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        I consent to sign electronically and certify the information above is correct (W-9 certification).
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Sign & submit W-9"}
      </button>
    </form>
  );
}

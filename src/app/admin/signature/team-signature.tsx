"use client";

import { useRef, useState, useTransition } from "react";
import { saveTeamSignature } from "@/app/actions";
import SignaturePad, { type SignatureHandle } from "@/app/agent/sign/w9/signature-pad";

export default function TeamSignature({ existing }: { existing: string | null }) {
  const sigRef = useRef<SignatureHandle>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  function save() {
    const png = sigRef.current?.toPng();
    if (!png) {
      setMsg("Please sign in the box first.");
      return;
    }
    const fd = new FormData();
    fd.set("signature", png);
    start(async () => {
      const r = await saveTeamSignature(fd);
      setMsg(r?.error ?? "Saved! This signature will be applied to every ICA going forward.");
    });
  }

  return (
    <div className="space-y-3">
      {existing && (
        <div>
          <p className="text-xs text-slate-500">Current signature on file:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={existing} alt="current signature" className="mt-1 h-16 rounded border border-slate-200 bg-white p-1" />
        </div>
      )}
      <SignaturePad ref={sigRef} />
      <button
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save my signature"}
      </button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}

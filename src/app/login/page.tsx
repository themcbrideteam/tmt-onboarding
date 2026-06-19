"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_DOMAIN = "themcbrideteam.com";

export default function LoginPage() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setBlocked(new URLSearchParams(window.location.search).get("error") === "domain");
  }, []);

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Hint Google to the Workspace domain (enforced server-side in the callback).
        queryParams: { hd: ALLOWED_DOMAIN },
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="The McBride Team" className="mx-auto h-12 w-auto" />
        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Agent Onboarding
        </p>
        <button
          onClick={signIn}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light"
        >
          Continue with Google
        </button>
        {blocked && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            That account isn&apos;t allowed. Sign in with your @{ALLOWED_DOMAIN} account.
          </p>
        )}
        <p className="mt-4 text-center text-xs text-slate-400">Use your TMT Google Workspace account.</p>
        <p className="mt-6 text-center font-heading text-sm italic text-navy">Guiding you home.</p>
      </div>
    </main>
  );
}

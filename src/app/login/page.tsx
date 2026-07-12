"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mark } from "@/components/ascent";

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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", maxWidth: 380, width: "100%", animation: "rise 1s var(--ease-out) both" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Mark size={56} />
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: ".2em" }}>ASCENT</h1>
        <p className="eyebrow" style={{ marginTop: 10 }}>The McBride Team · Agent Launch</p>
        <div className="a-card" style={{ marginTop: 34, padding: "30px 28px" }}>
          <button onClick={signIn} className="a-btn solid" style={{ width: "100%", padding: "12px 20px", fontSize: 13.5 }}>
            Continue with Google
          </button>
          {blocked && (
            <p style={{ marginTop: 14, fontSize: 12.5, color: "#F6ACB6", background: "rgba(228,92,112,.1)", border: "1px solid rgba(228,92,112,.35)", borderRadius: 10, padding: "8px 12px" }}>
              That account isn&apos;t allowed. Sign in with your @{ALLOWED_DOMAIN} account.
            </p>
          )}
          <p className="a-dimtxt" style={{ marginTop: 14, fontSize: 12 }}>Use your TMT Google Workspace account.</p>
        </div>
        <p className="a-dimtxt" style={{ marginTop: 26, fontSize: 13, fontStyle: "italic" }}>Guiding you home.</p>
      </div>
    </main>
  );
}

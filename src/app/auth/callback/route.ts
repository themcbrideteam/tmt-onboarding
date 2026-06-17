import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// OAuth callback: exchanges the code for a session, then ensures a profiles row.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Create a profile on first login (idempotent).
      if (user) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name ?? user.email,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

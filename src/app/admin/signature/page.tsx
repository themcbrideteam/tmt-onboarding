import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BrandHeader from "@/components/brand-header";
import TeamSignature from "./team-signature";

export default async function SignaturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect("/agent");

  const { data: signed } = await supabase.storage
    .from("agent-files")
    .createSignedUrl("config/team-signature.png", 600);

  return (
    <main className="min-h-screen bg-slate-50">
      <BrandHeader subtitle="My signature" maxWidth="max-w-xl">
        <Link href="/admin" className="hover:text-white">← Dashboard</Link>
      </BrandHeader>
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-500">
          Draw your signature once. It&apos;s applied automatically as both <strong>Team Lead</strong> and{" "}
          <strong>Broker of Record</strong> on every agent&apos;s ICA, so each agreement is fully executed the
          moment the agent signs.
        </p>
        <TeamSignature existing={signed?.signedUrl ?? null} />
      </div>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaperShell } from "@/components/ascent";
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
    <PaperShell
      sub="Broker signature"
      backHref="/admin"
      intro="Draw your signature once. It's applied automatically as both Team Lead and Broker of Record on every agent's ICA, so each agreement is fully executed the moment the agent signs."
    >
      <TeamSignature existing={signed?.signedUrl ?? null} />
    </PaperShell>
  );
}

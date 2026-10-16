import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/ui/notice";
import { PageFrame } from "@/components/ui/page-frame";
import { canAccessGuideDashboard } from "@/lib/tours/guide-access";
import { GUIDE_OWN_STATUS_SELECT, GUIDE_TABLE, GUIDE_USER_ID_COLUMN } from "@/lib/tours/guide-contract";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GuideDashboardPage() {
  if (!isSupabaseConfigured()) return <PageFrame><Notice variant="warning" title="Supabase setup is needed">Configure Supabase before opening the guide dashboard.</Notice></PageFrame>;

  let session;
  try {
    session = await getAuthenticatedSession();
  } catch {
    session = { user: null, role: null, error: "Supabase could not be reached." };
  }
  if (!session.user) redirect(`/login?next=${encodeURIComponent("/tours/guide/dashboard")}`);
  if (session.role === "admin") redirect("/tours/admin/guides");
  if (session.error || !session.role) return <PageFrame><Notice variant="error" title="We could not verify your account">{session.error ?? "Your role could not be verified."}</Notice></PageFrame>;

  const supabase = await createSupabaseServerClient();
  const { data: guide, error } = await supabase
    .from(GUIDE_TABLE)
    .select(GUIDE_OWN_STATUS_SELECT)
    .eq(GUIDE_USER_ID_COLUMN, session.user.id)
    .maybeSingle();
  if (error) return <PageFrame><Notice variant="error" title="Guide accreditation could not be checked">Access is paused until status can be verified.</Notice></PageFrame>;
  if (!guide) redirect("/tours/guide/register");
  if (guide.accreditation_status !== "approved") {
    if (guide.accreditation_status === "rejected") redirect("/tours/guide/register");
    redirect("/tours/guide/pending");
  }
  if (!canAccessGuideDashboard(session.role, guide.accreditation_status)) {
    return <PageFrame><Notice variant="error" title="Guide access is not enabled">Your application is approved, but your account role does not match. Contact the Tourism Office administrator.</Notice></PageFrame>;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", session.user.id)
    .maybeSingle();
  if (profileError || !profile?.full_name) {
    return <PageFrame><Notice variant="error" title="Your guide profile name is unavailable">Contact the Tourism Office so your public profile can be checked.</Notice></PageFrame>;
  }

  return (
    <PageFrame>
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">Approved guide</p>
        <h1 className="mt-2 text-3xl font-black text-daet-ink">Welcome, {profile.full_name}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-daet-ink/65">Your accreditation is approved. Your public guide profile can now be verified using your badge QR.</p>
        <Link href="/tours/guide/my-qr" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-daet-forest px-6 text-sm font-bold text-white transition hover:bg-daet-ink">Open My QR Code</Link>
      </section>
    </PageFrame>
  );
}

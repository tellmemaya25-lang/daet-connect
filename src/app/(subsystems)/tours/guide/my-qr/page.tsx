import { redirect } from "next/navigation";
import { Notice } from "@/components/ui/notice";
import { PageFrame } from "@/components/ui/page-frame";
import { GuideQrBadge } from "@/app/(subsystems)/tours/guide/guide-qr-badge";
import { canAccessGuideQr } from "@/lib/tours/guide-access";
import { GUIDE_OWN_STATUS_SELECT, GUIDE_TABLE, GUIDE_USER_ID_COLUMN } from "@/lib/tours/guide-contract";
import { createGuideQrPngDataUrl } from "@/lib/tours/guide-qr";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyGuideQrPage() {
  if (!isSupabaseConfigured()) return <PageFrame><Notice variant="warning" title="Supabase setup is needed">Configure Supabase to access your approved guide QR.</Notice></PageFrame>;

  let session;
  try {
    session = await getAuthenticatedSession();
  } catch {
    session = { user: null, role: null, error: "Supabase could not be reached." };
  }
  if (!session.user) redirect(`/login?next=${encodeURIComponent("/tours/guide/my-qr")}`);
  if (session.role === "admin") redirect("/tours/admin/guides");
  if (session.error || !session.role) return <PageFrame><Notice variant="error" title="We could not verify your account">{session.error ?? "Your role could not be verified."}</Notice></PageFrame>;

  const supabase = await createSupabaseServerClient();
  const { data: guide, error } = await supabase
    .from(GUIDE_TABLE)
    .select(GUIDE_OWN_STATUS_SELECT)
    .eq(GUIDE_USER_ID_COLUMN, session.user.id)
    .maybeSingle();
  if (error) return <PageFrame><Notice variant="error" title="Guide status could not be checked">The QR code stays unavailable until accreditation status can be verified.</Notice></PageFrame>;
  if (!guide) redirect("/tours/guide/register");
  if (guide.accreditation_status !== "approved") {
    if (guide.accreditation_status === "rejected") redirect("/tours/guide/register");
    redirect("/tours/guide/pending");
  }
  if (!canAccessGuideQr(session.role, guide.accreditation_status)) {
    return <PageFrame><Notice variant="error" title="Your guide QR is not enabled">Your profile is approved, but the account role does not match. Contact the Tourism Office administrator.</Notice></PageFrame>;
  }

  const qrDataUrl = await createGuideQrPngDataUrl(guide.id);
  return (
    <PageFrame>
      <div className="mb-7 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">Approved guide</p>
        <h1 className="mt-2 text-3xl font-black text-daet-ink">My QR Code</h1>
        <p className="mt-2 text-sm leading-6 text-daet-ink/65">Download the PNG or print a badge insert. The QR contains only your guide reference—never your ID number or document.</p>
      </div>
      <GuideQrBadge guideId={guide.id} fullName={guide.full_name} qrDataUrl={qrDataUrl} />
    </PageFrame>
  );
}

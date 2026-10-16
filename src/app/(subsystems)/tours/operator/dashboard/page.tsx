import { redirect } from "next/navigation";
import { Notice } from "@/components/ui/notice";
import { PageFrame } from "@/components/ui/page-frame";
import { canAccessOperatorDashboard } from "@/lib/tours/operator-access";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { getOwnOperatorApplicationStatus } from "@/lib/tours/operator-status";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function OperatorDashboardPage() {
  if (!isSupabaseConfigured()) {
    return <PageFrame><Notice variant="warning" title="Supabase setup is needed">Configure Supabase before opening the operator dashboard.</Notice></PageFrame>;
  }

  let session;
  try {
    session = await getAuthenticatedSession();
  } catch {
    session = { user: null, role: null, error: "Supabase could not be reached." };
  }

  if (!session.user) redirect(`/login?next=${encodeURIComponent("/tours/operator/dashboard")}`);
  if (session.role === "admin") redirect("/tours/admin/operators");
  if (session.error || !session.role) {
    return <PageFrame><Notice variant="error" title="We could not verify your account">{session.error ?? "Your role could not be verified."}</Notice></PageFrame>;
  }

  const statusResult = await getOwnOperatorApplicationStatus(session.user.id);

  if (!statusResult.ok) {
    return <PageFrame><Notice variant="error" title="Accreditation could not be checked">Access is paused until your accreditation status can be verified.</Notice></PageFrame>;
  }

  const application = statusResult.application;
  if (!application) redirect("/tours/operator/register");
  if (application.accreditation_status !== "approved") {
    if (application.accreditation_status === "rejected") redirect("/tours/operator/register");
    redirect("/tours/operator/pending");
  }
  if (!canAccessOperatorDashboard(session.role, application.accreditation_status)) {
    return <PageFrame><Notice variant="error" title="Operator access is not enabled">Your accreditation is approved, but the account role does not match. Contact the Tourism Office administrator.</Notice></PageFrame>;
  }

  return (
    <PageFrame>
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">Accredited operator</p>
        <h1 className="mt-2 text-3xl font-black text-daet-ink">Welcome to your operator dashboard.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-daet-ink/65">Your accreditation is approved. Package management and booking tools will appear here as those tours modules are added.</p>
        <div className="mt-7 inline-flex min-h-10 items-center rounded-full bg-emerald-50 px-4 text-sm font-bold text-emerald-800">Accreditation approved</div>
      </section>
    </PageFrame>
  );
}

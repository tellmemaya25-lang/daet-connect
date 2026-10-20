import { redirect } from "next/navigation";
import Link from "next/link";
import { PageFrame } from "@/components/ui/page-frame";
import { Notice } from "@/components/ui/notice";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PaymentSettingsForm } from "./payment-settings-form";

export const dynamic = "force-dynamic";

export default async function OperatorSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <Notice variant="warning" title="Supabase setup needed">
          Configure Supabase to access settings.
        </Notice>
      </PageFrame>
    );
  }

  const supabase = await createSupabaseServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/tours/operator/settings")}`);
  }

  // Get operator profile
  const { data: operator, error } = await supabase
    .from("tours_operators")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error || !operator) {
    return (
      <PageFrame>
        <Notice variant="error" title="Operator profile not found">
          You need an approved operator account to access settings.
        </Notice>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <DashboardHeader role="operator" />

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-daet-ink">Operator Settings</h1>
          <p className="mt-2 text-sm text-daet-ink/60">
            Manage your business profile and payment details
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/tours/operator/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-daet-ink/60 transition hover:text-daet-ink"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Business Info */}
        <div className="mb-6 rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-black text-daet-ink">Business Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-daet-ink/60">Business Name</p>
              <p className="font-bold text-daet-ink">{operator.business_name}</p>
            </div>
            <div>
              <p className="text-daet-ink/60">Contact Phone</p>
              <p className="font-bold text-daet-ink">{operator.contact_phone}</p>
            </div>
            <div>
              <p className="text-daet-ink/60">Business Address</p>
              <p className="font-bold text-daet-ink">{operator.business_address}</p>
            </div>
            <div>
              <p className="text-daet-ink/60">Status</p>
              <p className="font-bold capitalize text-emerald-700">
                {operator.accreditation_status}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Settings Form */}
        <div className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-black text-daet-ink">Payment Details</h2>
            <p className="mt-1 text-sm text-daet-ink/60">
              Set up where tourists should send payments for confirmed bookings
            </p>
          </div>
          <PaymentSettingsForm
            operatorId={operator.id}
            gcashNumber={operator.gcash_number}
            gcashName={operator.gcash_name}
            bankName={operator.bank_name}
            bankAccountNumber={operator.bank_account_number}
            bankAccountName={operator.bank_account_name}
            paymentInstructions={operator.payment_instructions}
          />
        </div>
      </div>
    </PageFrame>
  );
}

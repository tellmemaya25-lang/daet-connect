import { redirect } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import { Notice } from "@/components/ui/notice";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SuccessContent } from "./success-content";

export const dynamic = "force-dynamic";

interface PaymentSuccessPageProps {
  params: { id: string };
}

/**
 * Payment Success Page
 * 
 * Task 17: Payment Success Page
 * 
 * Displays after user is redirected from PayMongo checkout
 * - Polls transaction status for up to 30 seconds
 * - Shows loading state initially
 * - Displays booking confirmation when verified
 * - Provides options to view booking or download receipt
 * 
 * Acceptance Criteria:
 * - 7.3: Gateway redirects to success URL
 * - 7.5: Loading state is displayed initially
 * - 7.6: Booking confirmation is shown when verified
 * - 7.8: Transaction status is polled for up to 30 seconds
 */
export default async function PaymentSuccessPage({
  params,
}: PaymentSuccessPageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <Notice
          variant="warning"
          title="Supabase setup is needed"
        >
          Configure Supabase before continuing.
        </Notice>
      </PageFrame>
    );
  }

  let session;
  try {
    session = await getAuthenticatedSession();
  } catch {
    session = { user: null, role: null, error: "Supabase could not be reached." };
  }

  if (!session.user) {
    redirect(`/login?next=${encodeURIComponent(`/tours/tourist/bookings/${params.id}/payment-success`)}`);
  }

  if (session.error || !session.role) {
    return (
      <PageFrame>
        <Notice
          variant="error"
          title="We could not verify your account"
        >
          {session.error ?? "Your role could not be verified."}
        </Notice>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <SuccessContent bookingId={params.id} />
    </PageFrame>
  );
}

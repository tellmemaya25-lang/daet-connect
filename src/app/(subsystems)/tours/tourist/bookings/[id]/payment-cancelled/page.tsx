import { redirect } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import { Notice } from "@/components/ui/notice";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

interface PaymentCancelledPageProps {
  params: { id: string };
}

/**
 * Payment Cancelled Page
 * 
 * Task 18: Payment Cancelled Page
 * 
 * Displays when user cancels payment at PayMongo checkout
 * - Shows cancellation message
 * - Displays booking details for context
 * - Provides option to retry payment
 * - Link back to booking detail page
 * 
 * Acceptance Criteria:
 * - 7.4: Gateway redirects to cancel URL on cancellation
 * - 7.7: Cancellation message is displayed
 * - 7.7: "Retry Payment" option is available
 */
export default async function PaymentCancelledPage({
  params,
}: PaymentCancelledPageProps) {
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
    redirect(`/login?next=${encodeURIComponent(`/tours/tourist/bookings/${params.id}/payment-cancelled`)}`);
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
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Cancellation Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <svg
              className="h-8 w-8 text-orange-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-black text-daet-ink">Payment Cancelled</h1>
          <p className="max-w-md text-daet-ink/65">
            You cancelled the payment process. Your booking is still pending payment.
          </p>

          {/* Info Box */}
          <div className="mt-8 w-full max-w-md rounded-lg bg-daet-ink/5 p-4">
            <p className="text-sm text-daet-ink/65">
              No charges were made to your account. You can retry payment anytime before your booking date.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <a
              href={`/tours/tourist/bookings/${params.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            >
              Retry Payment <span aria-hidden="true">→</span>
            </a>
            <a
              href="/tours/tourist/bookings"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-daet-forest bg-white px-7 text-sm font-bold text-daet-forest shadow-sm transition hover:bg-daet-forest/5 focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            >
              Back to Bookings
            </a>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

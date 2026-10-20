import { redirect } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import { Notice } from "@/components/ui/notice";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTransactionDetail } from "../../payments/actions";
import { formatCurrency } from "@/lib/tours/payment-validation";
import { StatusBadge } from "../status-badge";
import { GatewayResponseSummary } from "./gateway-response-summary";

export const dynamic = "force-dynamic";

interface TransactionDetailPageProps {
  params: { id: string };
}

/**
 * Transaction Detail Page
 * 
 * Task 20: Transaction Detail Page
 * 
 * Displays complete transaction information:
 * - Transaction ID, booking details, payment date, amount, method, status
 * - Gateway response summary
 * - Receipt download button
 * - Link to booking detail page
 * 
 * Acceptance Criteria:
 * - 8.5: Full transaction details displayed
 * - 4.7: Gateway response summary shown
 * - 8.7: "Download Receipt" button for completed transactions
 */
export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <Notice variant="warning" title="Supabase setup is needed">
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
    redirect(`/login?next=${encodeURIComponent(`/tours/tourist/transactions/${params.id}`)}`);
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

  // Fetch transaction details
  const result = await getTransactionDetail(params.id);

  if (!result.success) {
    return (
      <PageFrame>
        <Notice variant="error" title="Transaction not found">
          {result.error || "We could not find this transaction."}
        </Notice>
      </PageFrame>
    );
  }

  const transaction = result.data;
  if (!transaction) {
    return (
      <PageFrame>
        <Notice variant="error" title="Transaction not found">
          We could not find this transaction in your records.
        </Notice>
      </PageFrame>
    );
  }

  const booking = transaction.bookings;
  const packageInfo = booking?.packages;

  const paymentDate = new Date(transaction.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const bookingDate = booking?.booking_date
    ? new Date(booking.booking_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown";

  return (
    <PageFrame>
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-daet-ink">Transaction Details</h1>
              <p className="mt-2 text-daet-ink/65">Reference: {transaction.id}</p>
            </div>
            <StatusBadge status={transaction.status} />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Left: Transaction Info */}
          <div>
            <h2 className="mb-4 font-bold text-daet-ink">Payment Details</h2>

            <div className="space-y-4">
              {/* Amount */}
              <div className="rounded-lg bg-daet-ink/5 p-4">
                <p className="text-sm text-daet-ink/65">Total Amount</p>
                <p className="mt-1 text-2xl font-black text-daet-ink">
                  {formatCurrency(transaction.amount / 100)}
                </p>
              </div>

              {/* Transaction Details Grid */}
              <div className="grid gap-3">
                <DetailRow label="Transaction ID" value={transaction.id} monospace />
                <DetailRow
                  label="Booking ID"
                  value={booking?.id || "Unknown"}
                  monospace
                />
                <DetailRow
                  label="Payment Date"
                  value={paymentDate}
                />
                <DetailRow
                  label="Payment Method"
                  value={transaction.payment_method ? transaction.payment_method.toUpperCase() : "Card"}
                />
                <DetailRow
                  label="Status"
                  value={transaction.status.toUpperCase()}
                />
              </div>

              {/* Refund Info (if applicable) */}
              {transaction.refunded_amount > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-bold text-orange-800">Refund Information</p>
                  <div className="mt-2 space-y-1 text-sm text-orange-700">
                    <p>
                      Amount Refunded:{" "}
                      <span className="font-bold">
                        {formatCurrency(transaction.refunded_amount / 100)}
                      </span>
                    </p>
                    {transaction.refund_reason && (
                      <p>Reason: {transaction.refund_reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking Info */}
          <div>
            <h2 className="mb-4 font-bold text-daet-ink">Booking Information</h2>

            <div className="space-y-4">
              {/* Package Info */}
              {packageInfo && (
                <div className="rounded-lg border border-daet-ink/10 p-4">
                  <h3 className="font-bold text-daet-ink">{packageInfo.title}</h3>
                  <p className="mt-1 text-sm text-daet-ink/65">
                    📍 {packageInfo.location_name}
                  </p>
                  {packageInfo.profiles?.full_name && (
                    <p className="mt-2 text-sm text-daet-ink/65">
                      Operator: {packageInfo.profiles.full_name}
                    </p>
                  )}
                </div>
              )}

              {/* Booking Details */}
              {booking && (
                <div className="grid gap-3">
                  <DetailRow
                    label="Booking ID"
                    value={booking.id}
                    monospace
                  />
                  <DetailRow
                    label="Booking Date"
                    value={bookingDate}
                  />
                  <DetailRow
                    label="Total Amount"
                    value={formatCurrency(booking.total_amount / 100)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gateway Response Summary */}
        {transaction.gateway_response && (
          <div className="mt-8 border-t border-daet-ink/10 pt-8">
            <GatewayResponseSummary response={transaction.gateway_response} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 border-t border-daet-ink/10 pt-8 sm:flex-row">
          <a
            href="/tours/tourist/transactions"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-daet-forest bg-white px-7 text-sm font-bold text-daet-forest shadow-sm transition hover:bg-daet-forest/5 focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
          >
            ← Back to Transactions
          </a>

          {booking && (
            <a
              href={`/tours/tourist/bookings/${booking.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            >
              View Booking <span aria-hidden="true">→</span>
            </a>
          )}

          {transaction.status === "completed" && (
            <button
              onClick={() => {
                // Download receipt - placeholder for Phase 5
                alert("Receipt download coming soon");
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-leaf px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-forest focus:outline-none focus:ring-4 focus:ring-daet-leaf/20 ml-auto"
            >
              Download Receipt
            </button>
          )}
        </div>
      </section>
    </PageFrame>
  );
}

/**
 * Detail Row Component
 */
function DetailRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 rounded-lg bg-daet-ink/5 p-3">
      <span className="text-sm text-daet-ink/65">{label}</span>
      <span className={`text-sm font-bold text-daet-ink text-right ${monospace ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

import { formatCurrency } from "@/lib/tours/payment-validation";
import { StatusBadge } from "./status-badge";
import type { TransactionWithBooking } from "@/lib/tours/payment-contract";

interface TransactionCardProps {
  transaction: TransactionWithBooking;
}

/**
 * Transaction Card Component
 * 
 * Displays a single transaction with:
 * - Booking title and location
 * - Transaction date
 * - Amount (formatted as PHP)
 * - Payment method
 * - Status badge
 * - View Receipt link (for completed)
 */
export function TransactionCard({ transaction }: TransactionCardProps) {
  const booking = transaction.bookings;
  const packageInfo = booking?.packages;
  const operatorProfile = packageInfo?.profiles;

  const bookingTitle = packageInfo?.title || "Tour Package";
  const bookingLocation = packageInfo?.location_name || "Location";
  const bookingDate = booking?.booking_date
    ? new Date(booking.booking_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown";

  const paymentDate = new Date(transaction.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-daet-ink/10 p-4 transition hover:border-daet-ink/30 hover:shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Transaction Info */}
        <div className="flex-1 min-w-0">
          {/* Booking Title */}
          <h3 className="font-bold text-daet-ink line-clamp-2">{bookingTitle}</h3>

          {/* Location and Booking Date */}
          <p className="mt-1 text-sm text-daet-ink/65">
            📍 {bookingLocation} • {bookingDate}
          </p>

          {/* Transaction Details */}
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:flex sm:gap-6">
            {/* Amount */}
            <div>
              <span className="text-daet-ink/65">Amount:</span>
              <p className="font-bold text-daet-ink">
                {formatCurrency(transaction.amount / 100)}
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <span className="text-daet-ink/65">Method:</span>
              <p className="font-bold text-daet-ink capitalize">
                {transaction.payment_method || "Card"}
              </p>
            </div>

            {/* Transaction ID */}
            <div className="col-span-2 sm:col-span-1">
              <span className="text-daet-ink/65 text-xs">ID:</span>
              <p className="font-mono text-xs text-daet-ink truncate">
                {transaction.id}
              </p>
            </div>

            {/* Payment Date */}
            <div className="col-span-2 sm:col-span-1">
              <span className="text-daet-ink/65 text-xs">Paid:</span>
              <p className="text-xs text-daet-ink">{paymentDate}</p>
            </div>
          </div>
        </div>

        {/* Right: Status and Actions */}
        <div className="flex flex-col gap-3 sm:items-end sm:text-right">
          {/* Status Badge */}
          <StatusBadge status={transaction.status} />

          {/* View Receipt Link */}
          {transaction.status === "completed" && (
            <a
              href={`/tours/tourist/transactions/${transaction.id}`}
              className="text-sm font-bold text-daet-forest hover:text-daet-ink transition"
            >
              View Details →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

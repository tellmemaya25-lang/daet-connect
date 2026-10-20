"use client";

import { useEffect, useState } from "react";
import { getTransactionStatus } from "../../../payments/actions";
import { formatCurrency } from "@/lib/tours/payment-validation";
import type { TransactionRecord } from "@/lib/tours/payment-contract";

interface SuccessContentProps {
  bookingId: string;
}

/**
 * Success Content Component
 * 
 * Client component that:
 * - Polls transaction status every 2 seconds
 * - Stops after 30 seconds or when status is final
 * - Displays confirmation when payment verified
 * - Shows loading state initially
 * - Provides action buttons (receipt, view booking)
 */
export function SuccessContent({ bookingId }: SuccessContentProps) {
  const [status, setStatus] = useState<"loading" | "verified" | "failed" | "timeout">("loading");
  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 15; // 15 * 2 seconds = 30 seconds max
    const pollInterval = 2000; // 2 seconds

    const pollTransaction = async () => {
      try {
        pollCount++;

        // Fetch transaction status
        const result = await getTransactionStatus(buildTransactionId(bookingId));

        if (!result.success) {
          // Try to get transaction detail with alternative lookup
          // For now, continue polling
          if (pollCount >= maxPolls) {
            setStatus("timeout");
            setError("Payment verification timed out. Please check your email or transaction history.");
          }
          return;
        }

        const txn = result.data;
        if (!txn) {
          if (pollCount >= maxPolls) {
            setStatus("timeout");
            setError("Payment verification timed out. Please check your email or transaction history.");
          }
          return;
        }

        setTransaction(txn);

        // Check if payment is completed
        if (txn.status === "completed") {
          setStatus("verified");
          return; // Stop polling
        } else if (txn.status === "failed") {
          setStatus("failed");
          setError("Payment failed. Please try again.");
          return; // Stop polling
        }

        // Continue polling if not final status
        if (pollCount >= maxPolls) {
          setStatus("timeout");
          setError("Payment verification timed out. Please check your email or transaction history.");
        }
      } catch (err) {
        console.error("Error polling transaction status:", err);
        if (pollCount >= maxPolls) {
          setStatus("timeout");
          setError("Error checking payment status. Please try again later.");
        }
      }
    };

    // Start polling immediately
    const intervalId = setInterval(pollTransaction, pollInterval);
    pollTransaction(); // First poll immediately

    return () => clearInterval(intervalId);
  }, [bookingId]);

  if (status === "loading") {
    return (
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-daet-forest border-r-transparent"></div>
          <h1 className="text-2xl font-bold text-daet-ink">Verifying your payment...</h1>
          <p className="text-sm text-daet-ink/65">Please wait while we confirm your transaction with the payment gateway.</p>
        </div>
      </section>
    );
  }

  if (status === "verified" && transaction) {
    return (
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Success Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-black text-daet-ink">Payment Confirmed!</h1>
          <p className="max-w-md text-daet-ink/65">
            Your payment has been successfully processed. Your booking is now confirmed.
          </p>

          {/* Transaction Details */}
          <div className="mt-8 w-full max-w-md rounded-lg bg-daet-ink/5 p-4">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-daet-ink/65">Transaction ID:</span>
              <span className="font-mono font-bold text-daet-ink">{transaction.id}</span>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-sm">
              <span className="text-daet-ink/65">Amount Paid:</span>
              <span className="font-bold text-daet-ink">
                {formatCurrency(transaction.amount / 100)}
              </span>
            </div>
            <div className="mt-3 flex justify-between gap-4 text-sm">
              <span className="text-daet-ink/65">Payment Method:</span>
              <span className="font-bold text-daet-ink capitalize">
                {transaction.payment_method || "Card"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <a
              href={`/tours/tourist/bookings/${bookingId}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            >
              View Booking <span aria-hidden="true">→</span>
            </a>
            <button
              onClick={() => {
                // Download receipt - placeholder for Phase 5
                alert("Receipt download coming soon");
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-daet-forest bg-white px-7 text-sm font-bold text-daet-forest shadow-sm transition hover:bg-daet-forest/5 focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            >
              Download Receipt
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (status === "failed") {
    return (
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-daet-ink">Payment Failed</h1>
          <p className="max-w-md text-daet-ink/65">
            {error || "Your payment could not be processed. Please try again."}
          </p>
          <a
            href={`/tours/tourist/bookings/${bookingId}`}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
          >
            Retry Payment <span aria-hidden="true">←</span>
          </a>
        </div>
      </section>
    );
  }

  // Timeout state
  return (
    <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-daet-ink">Verification Timeout</h1>
        <p className="max-w-md text-daet-ink/65">
          {error || "We're still checking your payment. Please refresh or check your transaction history."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
          >
            Refresh Page
          </button>
          <a
            href="/tours/tourist/transactions"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-daet-forest bg-white px-7 text-sm font-bold text-daet-forest shadow-sm transition hover:bg-daet-forest/5 focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
          >
            View Transactions
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Build transaction ID from booking ID
 * This is a placeholder - in a real app, you'd use the transaction ID from the session
 * For now, we'll use the booking ID to look up the most recent transaction
 */
function buildTransactionId(bookingId: string): string {
  // This should be replaced with actual transaction ID from payment session
  // For now returning booking ID as placeholder
  return `booking_${bookingId}`;
}

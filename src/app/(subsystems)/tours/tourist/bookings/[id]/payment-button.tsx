"use client";

import { useState } from "react";
import { createPaymentSession } from "../../payments/actions";

interface PaymentButtonProps {
  bookingId: string;
}

/**
 * Payment Button Component
 * 
 * Task 16: Payment Initiation Button Component
 * 
 * Displays a "Proceed to Payment" button that:
 * - Triggers payment session creation
 * - Shows loading state during processing
 * - Displays error messages on failure
 * - Redirects to PayMongo checkout on success
 * - Prevents double-submission
 * 
 * Acceptance Criteria:
 * - 1.1: "Proceed to Payment" button is displayed
 * - 1.6: Button redirects to gateway checkout on success
 * - 1.7: Error message is displayed on failure
 * - 18.2: Button has minimum height of 44px
 * - 18.6: Button is disabled on click to prevent double-submission
 */
export function PaymentButton({ bookingId }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentClick = async () => {
    try {
      // Prevent double-submission
      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      // Create payment session (server action)
      const result = await createPaymentSession(bookingId);

      if (!result.success) {
        setError(result.error || "Failed to initiate payment");
        setIsLoading(false);
        return;
      }

      // Redirect to PayMongo checkout URL
      if (result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        setError("Checkout URL not received from payment gateway");
        setIsLoading(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handlePaymentClick}
        disabled={isLoading}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
            Processing...
          </>
        ) : (
          <>
            Proceed to Payment <span aria-hidden="true">→</span>
          </>
        )}
      </button>

      {/* Error message display */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          <p className="font-medium">Payment Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}

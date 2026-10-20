"use client";

import { useState } from "react";
import { createPaymentIntent } from "@/lib/paymongo/actions";

interface GCashPaymentButtonProps {
  bookingId: string;
  bookingReference: string;
  totalAmount: number;
  paymentStatus: string;
}

export function GCashPaymentButton({
  bookingId,
  bookingReference,
  totalAmount,
  paymentStatus,
}: GCashPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayWithGCash = async () => {
    setIsProcessing(true);

    try {
      // Convert to centavos (PayMongo expects amount in centavos)
      const amountInCentavos = Math.round(totalAmount * 100);

      const result = await createPaymentIntent({
        bookingId,
        amount: amountInCentavos,
        description: `DAET Tours - ${bookingReference}`,
      });

      if (!result.success) {
        alert(`Error: ${result.error}`);
        setIsProcessing(false);
        return;
      }

      // Redirect to GCash payment page
      // Note: In production, you'd create a payment method and get checkout URL
      alert(
        `Payment Intent Created!\n\nPayment Intent ID: ${result.paymentIntentId}\n\nIn production, this will redirect to GCash payment page.`
      );

      // TODO: Integrate with PayMongo Checkout or create payment method
      // For now, this shows the concept
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show button if already paid
  if (paymentStatus === "paid") {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 text-center">
        <p className="text-sm font-bold text-emerald-800">✓ Paid</p>
      </div>
    );
  }

  return (
    <button
      onClick={handlePayWithGCash}
      disabled={isProcessing}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#007DFF] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0066CC] disabled:opacity-50"
    >
      {isProcessing ? (
        <>
          <span className="animate-spin">⏳</span>
          Processing...
        </>
      ) : (
        <>
          <span>💳</span>
          Pay with GCash - ₱{totalAmount.toLocaleString()}
        </>
      )}
    </button>
  );
}

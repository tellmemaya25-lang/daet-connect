"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "./actions";

type BookingActionButtonsProps = {
  bookingId: string;
  currentStatus: string;
};

export function BookingActionButtons({
  bookingId,
  currentStatus,
}: BookingActionButtonsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = async (newStatus: string) => {
    if (
      !confirm(
        `Are you sure you want to ${newStatus === "confirmed" ? "confirm" : newStatus === "rejected" ? "reject" : "update"} this booking?`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await updateBookingStatus(bookingId, newStatus);

    if (!result.success) {
      setError(result.error || "Failed to update booking");
      setIsSubmitting(false);
    } else {
      // Force immediate refresh without full page reload
      router.refresh();
    }
  };

  // Only show actions for pending or confirmed bookings
  if (currentStatus === "cancelled" || currentStatus === "rejected" || currentStatus === "completed") {
    return null;
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {currentStatus === "pending" && (
          <>
            <button
              onClick={() => handleStatusUpdate("confirmed")}
              disabled={isSubmitting}
              className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "✓ Confirm Booking"}
            </button>
            <button
              onClick={() => handleStatusUpdate("rejected")}
              disabled={isSubmitting}
              className="rounded-full border border-rose-300 bg-white px-6 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "✕ Reject"}
            </button>
          </>
        )}

        {currentStatus === "confirmed" && (
          <>
            <button
              onClick={() => handleStatusUpdate("completed")}
              disabled={isSubmitting}
              className="rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "✓ Mark as Completed"}
            </button>
            <button
              onClick={() => handleStatusUpdate("cancelled")}
              disabled={isSubmitting}
              className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Cancel Booking"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

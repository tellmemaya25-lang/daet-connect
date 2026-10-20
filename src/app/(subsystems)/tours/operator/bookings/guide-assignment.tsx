"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignGuideToBooking } from "./actions";

type GuideAssignmentProps = {
  bookingId: string;
  currentGuideId: string | null;
  availableGuides: Array<{ id: string; full_name: string; contact_phone: string }>;
};

export function GuideAssignment({
  bookingId,
  currentGuideId,
  availableGuides,
}: GuideAssignmentProps) {
  const router = useRouter();
  const [selectedGuideId, setSelectedGuideId] = useState(currentGuideId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedGuideId) {
      setError("Please select a guide");
      return;
    }

    if (selectedGuideId === currentGuideId) {
      setError("This guide is already assigned");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await assignGuideToBooking(bookingId, selectedGuideId);

    if (!result.success) {
      setError(result.error || "Failed to assign guide");
      setIsSubmitting(false);
    } else {
      router.refresh();
    }
  };

  const handleUnassign = async () => {
    if (!confirm("Are you sure you want to unassign this guide?")) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await assignGuideToBooking(bookingId, null);

    if (!result.success) {
      setError(result.error || "Failed to unassign guide");
      setIsSubmitting(false);
    } else {
      setSelectedGuideId("");
      router.refresh();
    }
  };

  if (availableGuides.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        No approved guides available. Guides must be approved before assignment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <select
          value={selectedGuideId}
          onChange={(e) => setSelectedGuideId(e.target.value)}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-daet-ink/20 px-4 py-2 text-sm focus:border-daet-forest focus:outline-none focus:ring-2 focus:ring-daet-forest/20"
        >
          <option value="">Select a guide...</option>
          {availableGuides.map((guide) => (
            <option key={guide.id} value={guide.id}>
              {guide.full_name} - {guide.contact_phone}
            </option>
          ))}
        </select>

        {currentGuideId ? (
          <button
            onClick={handleUnassign}
            disabled={isSubmitting}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {isSubmitting ? "Unassigning..." : "Unassign"}
          </button>
        ) : (
          <button
            onClick={handleAssign}
            disabled={isSubmitting || !selectedGuideId}
            className="rounded-full bg-daet-forest px-6 py-2 text-sm font-bold text-white transition hover:bg-daet-ink disabled:opacity-50"
          >
            {isSubmitting ? "Assigning..." : "Assign"}
          </button>
        )}
      </div>

      {currentGuideId && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-daet-ink/60">Currently assigned:</span>
          <span className="font-bold text-daet-forest">
            {availableGuides.find((g) => g.id === currentGuideId)?.full_name || "Unknown"}
          </span>
        </div>
      )}
    </div>
  );
}

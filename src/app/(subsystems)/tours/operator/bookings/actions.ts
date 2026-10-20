"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  error?: string;
};

const VALID_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"];

export async function assignGuideToBooking(
  bookingId: string,
  guideId: string | null
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Get operator profile
    const { data: operator, error: operatorError } = await supabase
      .from("tours_operators")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (operatorError || !operator) {
      return { success: false, error: "Operator profile not found" };
    }

    // Verify the booking belongs to this operator's package
    const { data: booking, error: bookingFetchError } = await supabase
      .from("tours_bookings")
      .select(
        `
        id,
        tours_packages!inner (
          operator_id
        )
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingFetchError || !booking) {
      return { success: false, error: "Booking not found" };
    }

    // Check ownership
    const pkg = Array.isArray(booking.tours_packages)
      ? booking.tours_packages[0]
      : booking.tours_packages;

    if (pkg?.operator_id !== operator.id) {
      return { success: false, error: "Unauthorized" };
    }

    // If guideId provided, verify the guide exists and is approved
    if (guideId) {
      const { data: guide, error: guideError } = await supabase
        .from("tours_guides")
        .select("id, accreditation_status")
        .eq("id", guideId)
        .maybeSingle();

      if (guideError || !guide) {
        return { success: false, error: "Guide not found" };
      }

      if (guide.accreditation_status !== "approved") {
        return { success: false, error: "Guide is not approved" };
      }
    }

    // Assign or unassign guide
    const { error: updateError } = await supabase
      .from("tours_bookings")
      .update({ assigned_guide_id: guideId })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Guide assignment error:", updateError);
      return { success: false, error: "Failed to assign guide" };
    }

    // Revalidate the bookings page
    revalidatePath("/tours/operator/bookings");

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in assignGuideToBooking:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: string
): Promise<ActionResult> {
  try {
    // Validate status
    if (!VALID_STATUSES.includes(newStatus)) {
      return { success: false, error: "Invalid status" };
    }

    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Get operator profile
    const { data: operator, error: operatorError } = await supabase
      .from("tours_operators")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (operatorError || !operator) {
      return { success: false, error: "Operator profile not found" };
    }

    // Verify the booking belongs to this operator's package
    const { data: booking, error: bookingFetchError } = await supabase
      .from("tours_bookings")
      .select(
        `
        id,
        status,
        tours_packages!inner (
          operator_id
        )
      `
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingFetchError || !booking) {
      return { success: false, error: "Booking not found" };
    }

    // Check ownership
    const pkg = Array.isArray(booking.tours_packages)
      ? booking.tours_packages[0]
      : booking.tours_packages;

    if (pkg?.operator_id !== operator.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("tours_bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Booking update error:", updateError);
      return { success: false, error: "Failed to update booking" };
    }

    // Revalidate the bookings page
    revalidatePath("/tours/operator/bookings");

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateBookingStatus:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

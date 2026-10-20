"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RecordPaymentInput {
  bookingId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  paymentDate: string;
  notes: string | null;
}

export async function recordPayment(input: RecordPaymentInput) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user is an operator and owns this booking's package
    const { data: booking, error: bookingError } = await supabase
      .from("tours_bookings")
      .select(
        `
        id,
        total_amount,
        total_paid,
        payment_status,
        tours_packages!inner (
          id,
          tours_operators!inner (
            id,
            profile_id
          )
        )
      `
      )
      .eq("id", input.bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking not found" };
    }

    // Type guard for tours_packages
    const pkg = Array.isArray(booking.tours_packages)
      ? booking.tours_packages[0]
      : booking.tours_packages;

    if (!pkg) {
      return { success: false, error: "Package not found" };
    }

    const operator = Array.isArray(pkg.tours_operators)
      ? pkg.tours_operators[0]
      : pkg.tours_operators;

    if (!operator || operator.profile_id !== user.id) {
      return { success: false, error: "Not authorized to record payments for this booking" };
    }

    // Validate amount
    if (input.amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" };
    }

    const remaining = booking.total_amount - (booking.total_paid || 0);
    if (input.amount > remaining) {
      return {
        success: false,
        error: `Amount exceeds remaining balance of ₱${remaining.toFixed(2)}`,
      };
    }

    // Insert payment record
    const { error: insertError } = await supabase.from("tours_payments").insert({
      booking_id: input.bookingId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      payment_status: "completed",
      reference_number: input.referenceNumber,
      payment_date: input.paymentDate,
      notes: input.notes,
      recorded_by: user.id,
    });

    if (insertError) {
      console.error("Payment insert error:", insertError);
      return { success: false, error: "Failed to record payment" };
    }

    // The trigger will automatically update booking payment status
    revalidatePath("/tours/operator/bookings");

    // Calculate new status for message
    const newTotalPaid = (booking.total_paid || 0) + input.amount;
    const statusMessage =
      newTotalPaid >= booking.total_amount
        ? "Booking is now fully paid!"
        : `Remaining balance: ₱${(booking.total_amount - newTotalPaid).toFixed(2)}`;

    return {
      success: true,
      message: statusMessage,
    };
  } catch (error) {
    console.error("Record payment error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

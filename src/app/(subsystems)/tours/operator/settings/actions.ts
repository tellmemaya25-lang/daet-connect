"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface UpdatePaymentSettingsInput {
  operatorId: string;
  gcashNumber: string | null;
  gcashName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  paymentInstructions: string | null;
}

export async function updatePaymentSettings(input: UpdatePaymentSettingsInput) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify operator ownership
    const { data: operator, error: verifyError } = await supabase
      .from("tours_operators")
      .select("id, profile_id")
      .eq("id", input.operatorId)
      .single();

    if (verifyError || !operator) {
      return { success: false, error: "Operator not found" };
    }

    if (operator.profile_id !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    // Update payment settings
    const { error: updateError } = await supabase
      .from("tours_operators")
      .update({
        gcash_number: input.gcashNumber,
        gcash_name: input.gcashName,
        bank_name: input.bankName,
        bank_account_number: input.bankAccountNumber,
        bank_account_name: input.bankAccountName,
        payment_instructions: input.paymentInstructions,
      })
      .eq("id", input.operatorId);

    if (updateError) {
      console.error("Payment settings update error:", updateError);
      return { success: false, error: "Failed to update payment settings" };
    }

    revalidatePath("/tours/operator/settings");
    revalidatePath("/tours/my-bookings");

    return { success: true };
  } catch (error) {
    console.error("Update payment settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

"use server";

import { paymongoClient } from "./client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface CreatePaymentIntentInput {
  bookingId: string;
  amount: number; // in centavos (e.g., 850000 for ₱8500)
  description: string;
}

export async function createPaymentIntent(input: CreatePaymentIntentInput) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from("tours_bookings")
      .select("id, tourist_profile_id, total_amount, payment_status")
      .eq("id", input.bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.tourist_profile_id !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    if (booking.payment_status === "paid") {
      return { success: false, error: "Booking is already paid" };
    }

    // Create PayMongo Payment Intent
    const paymentIntent = await paymongoClient.paymentIntents.create({
      data: {
        attributes: {
          amount: input.amount,
          currency: "PHP",
          payment_method_allowed: ["gcash"], // Only GCash for now
          description: input.description,
          statement_descriptor: "DAET TOURS",
          metadata: {
            booking_id: input.bookingId,
            user_id: user.id,
          },
        },
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.data.id,
      clientKey: paymentIntent.data.attributes.client_key,
      status: paymentIntent.data.attributes.status,
    };
  } catch (error: any) {
    console.error("Create payment intent error:", error);
    return {
      success: false,
      error: error.message || "Failed to create payment intent",
    };
  }
}

export async function attachPaymentMethod(paymentIntentId: string, paymentMethodId: string) {
  try {
    const attachedPaymentIntent = await paymongoClient.paymentIntents.attach({
      id: paymentIntentId,
      data: {
        attributes: {
          payment_method: paymentMethodId,
          client_key: "", // Will be provided from client
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tours/my-bookings`,
        },
      },
    });

    return {
      success: true,
      status: attachedPaymentIntent.data.attributes.status,
      nextAction: attachedPaymentIntent.data.attributes.next_action,
    };
  } catch (error: any) {
    console.error("Attach payment method error:", error);
    return {
      success: false,
      error: error.message || "Failed to attach payment method",
    };
  }
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await paymongoClient.paymentIntents.retrieve({
      id: paymentIntentId,
    });

    return {
      success: true,
      status: paymentIntent.data.attributes.status,
      amount: paymentIntent.data.attributes.amount,
      payments: paymentIntent.data.attributes.payments,
    };
  } catch (error: any) {
    console.error("Retrieve payment intent error:", error);
    return {
      success: false,
      error: error.message || "Failed to retrieve payment intent",
    };
  }
}

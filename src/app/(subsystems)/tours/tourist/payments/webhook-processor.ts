import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PayMongoWebhookEvent,
  PaymentStatus,
  TransactionRecord,
} from "@/lib/tours/payment-contract";
import { PAYMENT_FIELDS, PAYMENT_TRANSACTIONS_TABLE } from "@/lib/tours/payment-contract";

/**
 * Webhook Event Processor
 * 
 * Task 13: Process Webhook Event Function
 * - Extracts payment tokens from webhook payload
 * - Locates transactions by payment token
 * - Updates transaction status
 * - Stores gateway response
 * - Triggers booking status updates
 * 
 * Task 14: Update Booking Status After Payment
 * - Updates booking status with retry logic
 * - Implements exponential backoff (1s, 5s, 15s)
 * - Releases payment lock on completion
 */

/**
 * Main webhook event processor
 * Called asynchronously from the webhook route
 * 
 * Acceptance Criteria:
 * - 5.4: Payment token is extracted
 * - 5.5: Transaction is located by payment token
 * - 5.6: Transaction status updated to "completed" on success
 * - 5.7: Transaction status updated to "failed" on failure
 * - 5.9: Processing is idempotent
 * - 2.7: Payment method captured and stored
 * - 4.7: Gateway response stored as JSON
 */
export async function processWebhookEvent(event: PayMongoWebhookEvent): Promise<void> {
  try {
    // Extract event details
    const eventId = event.data.id;
    const eventType = event.data.attributes.type;
    const paymentData = event.data.attributes.data;

    console.log("[webhook-processor] Processing event", {
      eventId,
      eventType,
      paymentId: paymentData.id,
      paymentStatus: paymentData.attributes.status,
    });

    // Map webhook event type to our payment status
    const status = mapWebhookEventToStatus(eventType);
    if (!status) {
      console.warn("[webhook-processor] Unknown event type", { eventType });
      return;
    }

    // Extract payment token (payment ID from PayMongo)
    const paymentToken = extractPaymentToken(paymentData);
    if (!paymentToken) {
      console.warn("[webhook-processor] Failed to extract payment token", {
        eventId,
        paymentData,
      });
      return;
    }

    // Extract payment method
    const paymentMethod = paymentData.attributes.source?.type || "unknown";

    // Create Supabase client (service role to bypass RLS)
    const supabase = await createSupabaseServerClient();

    // Check if event already processed (idempotency)
    const alreadyProcessed = await isEventAlreadyProcessed(
      supabase,
      paymentToken,
      eventId
    );
    if (alreadyProcessed) {
      console.log("[webhook-processor] Event already processed (idempotent)", {
        eventId,
        paymentToken,
      });
      return;
    }

    // Find transaction by payment token
    const { data: transaction, error: fetchError } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select("*")
      .eq(PAYMENT_FIELDS.paymentToken, paymentToken)
      .single();

    if (fetchError || !transaction) {
      console.error("[webhook-processor] Transaction not found", {
        eventId,
        paymentToken,
        error: fetchError,
      });
      return;
    }

    console.log("[webhook-processor] Found transaction", {
      transactionId: transaction.id,
      bookingId: transaction.booking_id,
      currentStatus: transaction.status,
      newStatus: status,
    });

    // Store full webhook payload in gateway response
    const gatewayResponse = {
      ...transaction.gateway_response,
      webhookEvent: {
        id: eventId,
        type: eventType,
        timestamp: new Date().toISOString(),
        paymentAttributes: paymentData.attributes,
      },
    };

    // Update transaction with new status and gateway response
    const { error: updateError } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .update({
        [PAYMENT_FIELDS.status]: status,
        [PAYMENT_FIELDS.paymentMethod]: paymentMethod,
        [PAYMENT_FIELDS.gatewayResponse]: gatewayResponse,
        [PAYMENT_FIELDS.updatedAt]: new Date().toISOString(),
      })
      .eq(PAYMENT_FIELDS.id, transaction.id);

    if (updateError) {
      console.error("[webhook-processor] Failed to update transaction", {
        transactionId: transaction.id,
        error: updateError,
      });
      return;
    }

    console.log("[webhook-processor] Transaction updated", {
      transactionId: transaction.id,
      status,
      paymentMethod,
    });

    // If payment completed, update booking status
    if (status === "completed") {
      await updateBookingStatusAfterPayment(
        supabase,
        transaction.booking_id,
        transaction.id,
        eventId
      );
    } else if (status === "failed") {
      // Log failed payment for manual investigation
      console.warn("[webhook-processor] Payment failed", {
        transactionId: transaction.id,
        bookingId: transaction.booking_id,
        paymentToken,
        eventId,
      });
    }
  } catch (error) {
    console.error("[webhook-processor] Unexpected error processing event", {
      error: error instanceof Error ? error.message : String(error),
      event,
    });
  }
}

/**
 * Extract payment token from PayMongo payment data
 * PayMongo returns payment ID as the unique identifier
 */
function extractPaymentToken(paymentData: PayMongoWebhookEvent["data"]["attributes"]["data"]): string | null {
  return paymentData.id || null;
}

/**
 * Map PayMongo event type to our payment status
 * 
 * PayMongo event types:
 * - payment.paid → completed
 * - payment.failed → failed
 * - payment.expired → expired
 * 
 * See: https://developers.paymongo.com/docs/webhooks
 */
function mapWebhookEventToStatus(eventType: string): PaymentStatus | null {
  const mapping: Record<string, PaymentStatus> = {
    "payment.paid": "completed",
    "payment.failed": "failed",
    "payment.expired": "expired",
  };

  return mapping[eventType] || null;
}

/**
 * Check if webhook event already processed (idempotency check)
 * 
 * Acceptance Criteria:
 * - 5.9: Processing is idempotent
 * 
 * We check if gateway_response contains the same eventId
 * This prevents duplicate status updates if webhook is delivered multiple times
 */
async function isEventAlreadyProcessed(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  paymentToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select(PAYMENT_FIELDS.gatewayResponse)
      .eq(PAYMENT_FIELDS.paymentToken, paymentToken)
      .single();

    if (error || !data) {
      return false;
    }

    const gatewayResponse = data.gateway_response as Record<string, any> | null;
    if (!gatewayResponse) {
      return false;
    }

    // Check if webhook event ID is already in gateway response
    return gatewayResponse.webhookEvent?.id === eventId;
  } catch (error) {
    console.warn("[webhook-processor] Error checking if event processed", error);
    return false;
  }
}

/**
 * Update booking status after successful payment
 * 
 * Task 14: Update Booking Status After Payment
 * 
 * Acceptance Criteria:
 * - 6.1: Booking record is retrieved from transaction
 * - 6.2: Booking status updated from "pending_payment" to "completed"
 * - 6.3: Booking updated_at timestamp is updated
 * - 6.4: Already completed/cancelled bookings are not modified
 * - 6.5: Failures are logged for retry
 * - 6.6: Retry logic with exponential backoff (3 attempts: 1s, 5s, 15s)
 * - 17.3: Booking lock is released after completion
 */
async function updateBookingStatusAfterPayment(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bookingId: string,
  transactionId: string,
  eventId: string
): Promise<void> {
  try {
    // Use retry logic with exponential backoff: 1s, 5s, 15s
    const backoffDelays = [1000, 5000, 15000];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < backoffDelays.length; attempt++) {
      try {
        // Wait before retry (except first attempt)
        if (attempt > 0) {
          const delayMs = backoffDelays[attempt - 1];
          console.log("[webhook-processor] Retrying booking update", {
            bookingId,
            transactionId,
            attempt: attempt + 1,
            delayMs,
          });
          await sleep(delayMs);
        }

        // Get current booking status
        const { data: booking, error: fetchError } = await supabase
          .from("tours_bookings")
          .select("status, payment_lock")
          .eq("id", bookingId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch booking: ${fetchError.message}`);
        }

        if (!booking) {
          throw new Error("Booking not found");
        }

        // Only update if booking is still in pending_payment status
        if (booking.status !== "pending_payment") {
          console.log(
            "[webhook-processor] Booking already completed or cancelled, skipping update",
            {
              bookingId,
              currentStatus: booking.status,
            }
          );
          return;
        }

        // Update booking status to "completed"
        const { error: updateError } = await supabase
          .from("tours_bookings")
          .update({
            status: "completed",
            payment_lock: null, // Release payment lock
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
          .eq("status", "pending_payment"); // Ensure we only update if still pending

        if (updateError) {
          throw new Error(`Failed to update booking: ${updateError.message}`);
        }

        console.log("[webhook-processor] Booking status updated successfully", {
          bookingId,
          transactionId,
          eventId,
        });

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === backoffDelays.length - 1) {
          // Last attempt failed, throw error
          throw lastError;
        }

        console.warn(
          "[webhook-processor] Booking update failed, will retry",
          {
            bookingId,
            transactionId,
            attempt: attempt + 1,
            error: lastError.message,
          }
        );
      }
    }
  } catch (error) {
    console.error(
      "[webhook-processor] Failed to update booking after payment (all retries exhausted)",
      {
        bookingId,
        transactionId,
        eventId,
        error: error instanceof Error ? error.message : String(error),
      }
    );

    // Log for manual intervention
    // In production, this could trigger an alert to support team
  }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

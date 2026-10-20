"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import {
  PAYMENT_TRANSACTIONS_TABLE,
  PAYMENT_FIELDS,
  TRANSACTION_LIST_SELECT,
  TRANSACTION_DETAIL_SELECT,
  type TransactionRecord,
  type TransactionWithBooking,
  type PayMongoCheckoutSessionRequest,
  type PayMongoCheckoutSessionResponse,
} from "@/lib/tours/payment-contract";
import {
  validateBookingForPayment,
  validatePaymentAmount,
  generateIdempotencyKey,
  pesosToCentavos,
  centavosToPesos,
  formatCurrency,
} from "@/lib/tours/payment-validation";

interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Create payment session with PayMongo
 * 
 * Validates booking eligibility, generates idempotency key, creates PayMongo checkout session,
 * and stores transaction record. Returns checkout URL for redirect.
 */
export async function createPaymentSession(
  bookingId: string
): Promise<ActionResult<{ checkoutUrl: string; transactionId: string }>> {
  try {
    // 1. Authenticate
    const session = await getAuthenticatedSession();
    if (!session.user) {
      return { success: false, error: "You must be signed in" };
    }

    // 2. Get booking and validate
    const supabase = await createSupabaseServerClient();
    const { data: booking, error: bookingError } = await supabase
      .from("tours_bookings")
      .select("id, tourist_id, total_amount, status, package_id, booking_date, packages!inner(title, location_name)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("createPaymentSession: booking fetch error", bookingError);
      return { success: false, error: "Booking not found" };
    }

    // 3. Validate booking eligibility
    const validation = validateBookingForPayment(
      {
        status: booking.status,
        total_amount: booking.total_amount,
        tourist_id: booking.tourist_id,
      },
      session.user.id
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 4. Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(bookingId);

    // 5. Check for existing pending transaction with same idempotency key (within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingTransaction } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select("id, payment_token, status")
      .eq(PAYMENT_FIELDS.idempotencyKey, idempotencyKey)
      .gte(PAYMENT_FIELDS.createdAt, twentyFourHoursAgo)
      .in(PAYMENT_FIELDS.status, ["pending", "processing"])
      .maybeSingle();

    if (existingTransaction && existingTransaction.payment_token) {
      // Return existing session
      const checkoutUrl = await retrieveCheckoutUrl(existingTransaction.payment_token);
      if (checkoutUrl) {
        return {
          success: true,
          data: {
            checkoutUrl,
            transactionId: existingTransaction.id,
          },
        };
      }
    }

    // 6. Create PayMongo checkout session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/tours/tourist/bookings/${bookingId}/payment-success`;
    const cancelUrl = `${baseUrl}/tours/tourist/bookings/${bookingId}/payment-cancelled`;

    const packages = Array.isArray(booking.packages) ? booking.packages[0] : booking.packages;
    const checkoutSession = await createPayMongoCheckout({
      amount: booking.total_amount,
      bookingId: booking.id,
      description: `${packages?.title || "Tour Package"} - ${packages?.location_name || "Daet"}`,
      successUrl,
      cancelUrl,
    });

    if (!checkoutSession.success || !checkoutSession.data) {
      return { success: false, error: checkoutSession.error || "Failed to create payment session" };
    }

    // 7. Store transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .insert({
        [PAYMENT_FIELDS.bookingId]: bookingId,
        [PAYMENT_FIELDS.paymentToken]: checkoutSession.data.sessionId,
        [PAYMENT_FIELDS.amount]: booking.total_amount,
        [PAYMENT_FIELDS.currency]: "PHP",
        [PAYMENT_FIELDS.status]: "pending",
        [PAYMENT_FIELDS.idempotencyKey]: idempotencyKey,
        [PAYMENT_FIELDS.gatewayResponse]: {
          checkout_session_id: checkoutSession.data.sessionId,
          checkout_url: checkoutSession.data.checkoutUrl,
        },
      })
      .select("id")
      .single();

    if (transactionError || !transaction) {
      console.error("createPaymentSession: transaction insert error", transactionError);
      return { success: false, error: "Failed to create transaction record" };
    }

    return {
      success: true,
      data: {
        checkoutUrl: checkoutSession.data.checkoutUrl,
        transactionId: transaction.id,
      },
    };
  } catch (error) {
    console.error("createPaymentSession: unexpected error", error);
    return { success: false, error: "Failed to create payment session" };
  }
}

/**
 * Create PayMongo checkout session via API
 */
async function createPayMongoCheckout(params: {
  amount: number;
  bookingId: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<ActionResult<{ checkoutUrl: string; sessionId: string }>> {
  try {
    const apiKey = process.env.PAYMONGO_SECRET_KEY;
    const testMode = process.env.PAYMENT_TEST_MODE === "true";

    if (!apiKey) {
      console.error("PAYMONGO_SECRET_KEY not configured");
      return { success: false, error: "Payment gateway not configured" };
    }

    const requestBody: PayMongoCheckoutSessionRequest = {
      data: {
        attributes: {
          line_items: [
            {
              name: params.description,
              amount: pesosToCentavos(params.amount),
              currency: "PHP",
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "card", "paymaya", "grab_pay"],
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          reference_number: params.bookingId,
          description: params.description,
          metadata: {
            booking_id: params.bookingId,
            test_mode: testMode.toString(),
          },
        },
      },
    };

    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("PayMongo API error:", response.status, errorData);
      return {
        success: false,
        error: `Payment gateway error: ${response.status}`,
      };
    }

    const data: PayMongoCheckoutSessionResponse = await response.json();

    return {
      success: true,
      data: {
        checkoutUrl: data.data.attributes.checkout_url,
        sessionId: data.data.id,
      },
    };
  } catch (error) {
    console.error("createPayMongoCheckout: error", error);
    return { success: false, error: "Failed to communicate with payment gateway" };
  }
}

/**
 * Retrieve checkout URL from existing session
 */
async function retrieveCheckoutUrl(sessionId: string): Promise<string | null> {
  try {
    const apiKey = process.env.PAYMONGO_SECRET_KEY;
    if (!apiKey) return null;

    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
      headers: {
        "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
      },
    });

    if (!response.ok) return null;

    const data: PayMongoCheckoutSessionResponse = await response.json();
    return data.data.attributes.checkout_url;
  } catch (error) {
    console.error("retrieveCheckoutUrl: error", error);
    return null;
  }
}

/**
 * Get transaction status for polling
 * 
 * Used by success page to check if webhook has updated the transaction yet.
 */
export async function getTransactionStatus(
  transactionId: string
): Promise<ActionResult<TransactionRecord>> {
  try {
    // 1. Authenticate
    const session = await getAuthenticatedSession();
    if (!session.user) {
      return { success: false, error: "You must be signed in" };
    }

    // 2. Get transaction with ownership check through booking
    const supabase = await createSupabaseServerClient();
    const { data: transaction, error } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select(`
        *,
        bookings!inner(tourist_id)
      `)
      .eq("id", transactionId)
      .eq("bookings.tourist_id", session.user.id)
      .single();

    if (error || !transaction) {
      console.error("getTransactionStatus: fetch error", error);
      return { success: false, error: "Transaction not found" };
    }

    // Remove the joined booking data before returning
    const { bookings, ...transactionData } = transaction as any;

    return {
      success: true,
      data: transactionData as TransactionRecord,
    };
  } catch (error) {
    console.error("getTransactionStatus: unexpected error", error);
    return { success: false, error: "Failed to get transaction status" };
  }
}

/**
 * Get all transactions for authenticated tourist with pagination
 */
export async function getTouristTransactions(
  page: number = 1,
  pageSize: number = 20
): Promise<ActionResult<TransactionWithBooking[]>> {
  try {
    // 1. Authenticate
    const session = await getAuthenticatedSession();
    if (!session.user) {
      return { success: false, error: "You must be signed in" };
    }

    // 2. Calculate pagination
    const offset = (page - 1) * pageSize;

    // 3. Get transactions with booking details
    const supabase = await createSupabaseServerClient();
    const { data: transactions, error } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select(TRANSACTION_LIST_SELECT)
      .eq("bookings.tourist_id", session.user.id)
      .order(PAYMENT_FIELDS.createdAt, { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("getTouristTransactions: fetch error", error);
      return { success: false, error: "Failed to load transactions" };
    }

    return {
      success: true,
      data: (transactions || []) as unknown as TransactionWithBooking[],
    };
  } catch (error) {
    console.error("getTouristTransactions: unexpected error", error);
    return { success: false, error: "Failed to load transactions" };
  }
}

/**
 * Get single transaction detail with complete information
 */
export async function getTransactionDetail(
  transactionId: string
): Promise<ActionResult<TransactionWithBooking>> {
  try {
    // 1. Authenticate
    const session = await getAuthenticatedSession();
    if (!session.user) {
      return { success: false, error: "You must be signed in" };
    }

    // 2. Get transaction with full details and ownership check
    const supabase = await createSupabaseServerClient();
    const { data: transaction, error } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select(TRANSACTION_DETAIL_SELECT)
      .eq("id", transactionId)
      .eq("bookings.tourist_id", session.user.id)
      .single();

    if (error || !transaction) {
      console.error("getTransactionDetail: fetch error", error);
      return { success: false, error: "Transaction not found" };
    }

    return {
      success: true,
      data: transaction as unknown as TransactionWithBooking,
    };
  } catch (error) {
    console.error("getTransactionDetail: unexpected error", error);
    return { success: false, error: "Failed to load transaction details" };
  }
}


/**
 * Generate Receipt for Completed Transaction
 * 
 * Task 22: Generate Receipt Server Action
 * 
 * Validates transaction completion, generates PDF receipt with QR code,
 * uploads to storage, and returns download URL.
 * 
 * Acceptance Criteria:
 * - 9.1: Receipt can be generated for completed transactions
 * - 9.4: PDF is returned as download
 * - 9.5: Receipt stored in tours_receipts bucket with path {tourist_id}/{transaction_id}.pdf
 * - 9.6: Receipt generation retries once after 2 seconds on failure
 * - 15.2: Tourist ownership is validated
 */
export async function generateReceipt(
  transactionId: string
): Promise<ActionResult<{ downloadUrl: string }>> {
  try {
    // 1. Authenticate
    const session = await getAuthenticatedSession();
    if (!session.user) {
      return { success: false, error: "You must be signed in" };
    }

    // 2. Get transaction with all details
    const supabase = await createSupabaseServerClient();
    const { data: transaction, error: fetchError } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select(TRANSACTION_DETAIL_SELECT)
      .eq(PAYMENT_FIELDS.id, transactionId)
      .single();

    if (fetchError || !transaction) {
      return { success: false, error: "Transaction not found" };
    }

    // 3. Validate transaction belongs to authenticated user
    if (
      !transaction.bookings ||
      transaction.bookings.length === 0 ||
      transaction.bookings[0].tourist_id !== session.user.id
    ) {
      return { success: false, error: "You do not have access to this transaction" };
    }

    // 4. Check if transaction is completed
    if (transaction.status !== "completed") {
      return {
        success: false,
        error: "Receipt can only be generated for completed transactions",
      };
    }

    // 5. Check if receipt already exists
    const existingReceipt = await checkExistingReceipt(
      supabase,
      session.user.id,
      transactionId
    );

    if (existingReceipt) {
      return {
        success: true,
        data: { downloadUrl: existingReceipt },
      };
    }

    // 6. Generate receipt PDF (with retry)
    let receiptPdf: Buffer;
    try {
      const { generateReceiptPDF } = await import("@/lib/tours/receipt-generator");
      receiptPdf = await generateReceiptPDF({
        transaction: transaction as any,
        touristName: session.user.user_metadata?.full_name || "Tourist",
        touristEmail: session.user.email || "unknown@email.com",
      });
    } catch (error) {
      console.error("Receipt generation failed, retrying:", error);

      // Retry once after 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const { generateReceiptPDF } = await import("@/lib/tours/receipt-generator");
        receiptPdf = await generateReceiptPDF({
          transaction: transaction as any,
          touristName: session.user.user_metadata?.full_name || "Tourist",
          touristEmail: session.user.email || "unknown@email.com",
        });
      } catch (retryError) {
        console.error("Receipt generation failed after retry:", retryError);
        return {
          success: false,
          error: "Failed to generate receipt. Please try again.",
        };
      }
    }

    // 7. Upload receipt to storage
    const downloadUrl = await uploadReceiptToStorage(
      supabase,
      session.user.id,
      transactionId,
      receiptPdf
    );

    if (!downloadUrl) {
      return {
        success: false,
        error: "Failed to upload receipt. Please try again.",
      };
    }

    // 8. Store receipt metadata in database
    await storeReceiptMetadata(supabase, transactionId, session.user.id);

    return { success: true, data: { downloadUrl } };
  } catch (error) {
    console.error("Generate receipt error:", error);
    return {
      success: false,
      error: "An unexpected error occurred while generating receipt",
    };
  }
}

/**
 * Check if receipt already exists in storage
 */
async function checkExistingReceipt(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  touristId: string,
  transactionId: string
): Promise<string | null> {
  try {
    // Check in database for cached URL
    const { data, error } = await supabase
      .from("tours_receipts")
      .select("storage_url")
      .eq("transaction_id", transactionId)
      .eq("tourist_id", touristId)
      .single();

    if (!error && data?.storage_url) {
      // Verify URL is still valid by checking file exists
      const { data: fileExists } = await supabase.storage
        .from("tours_receipts")
        .list(touristId, {
          limit: 1,
          search: `${transactionId}.pdf`,
        });

      if (fileExists && fileExists.length > 0) {
        return data.storage_url;
      }
    }

    return null;
  } catch (error) {
    console.warn("Error checking existing receipt:", error);
    return null;
  }
}

/**
 * Upload receipt PDF to Supabase storage
 * 
 * Returns signed URL with 1-hour expiration
 */
async function uploadReceiptToStorage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  touristId: string,
  transactionId: string,
  pdfBuffer: Buffer
): Promise<string | null> {
  try {
    // Upload file to storage
    const filePath = `${touristId}/${transactionId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("tours_receipts")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "max-age=3600", // 1 hour
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return null;
    }

    // Generate signed URL with 1-hour expiration (3600 seconds)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from("tours_receipts")
      .createSignedUrl(filePath, 3600);

    if (urlError || !signedUrl?.signedUrl) {
      console.error("Signed URL generation error:", urlError);
      return null;
    }

    return signedUrl.signedUrl;
  } catch (error) {
    console.error("Storage upload error:", error);
    return null;
  }
}

/**
 * Store receipt metadata in database for quick retrieval
 */
async function storeReceiptMetadata(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  transactionId: string,
  touristId: string
): Promise<void> {
  try {
    // Try to create receipt metadata record (ignore errors if table doesn't exist)
    await supabase
      .from("tours_receipts")
      .upsert(
        {
          transaction_id: transactionId,
          tourist_id: touristId,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "transaction_id" }
      )
      .single();
  } catch (error) {
    // Silently fail - receipt still works via storage
    console.warn("Could not store receipt metadata:", error);
  }
}

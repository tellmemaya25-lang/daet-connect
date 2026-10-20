import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/tours/payment-validation";
import { processWebhookEvent } from "@/app/(subsystems)/tours/tourist/payments/webhook-processor";
import type { PayMongoWebhookEvent } from "@/lib/tours/payment-contract";

/**
 * PayMongo Webhook Endpoint
 * 
 * Receives payment status updates from PayMongo
 * POST /api/webhooks/payment
 * 
 * Security:
 * - Public endpoint, but relies on signature verification
 * - Validates HMAC-SHA256 signature header
 * - Rejects unauthorized requests with 401
 * - Always returns 200 to prevent PayMongo retries on our errors
 * - Logs all events for debugging and monitoring
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get("paymongo-signature");

    // 2. Validate signature header exists
    if (!signature) {
      console.error("[webhook] Missing signature header", {
        path: request.nextUrl.pathname,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // 3. Get webhook secret from environment
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[webhook] PAYMONGO_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 4. Verify webhook signature
    const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error("[webhook] Invalid signature", {
        path: request.nextUrl.pathname,
        ip: request.headers.get("x-forwarded-for") || "unknown",
        signature: signature.substring(0, 10) + "...",
      });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 5. Parse event
    let event: PayMongoWebhookEvent;
    try {
      event = JSON.parse(payload);
    } catch (error) {
      console.error("[webhook] Failed to parse payload", error);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 6. Validate event structure
    if (!event.data?.attributes?.data) {
      console.warn("[webhook] Invalid event structure", {
        eventId: event.data?.id,
        eventType: event.data?.attributes?.type,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 7. Log webhook received
    console.log("[webhook] Received payment event", {
      eventId: event.data.id,
      eventType: event.data.attributes.type,
      paymentId: event.data.attributes.data?.id,
      paymentStatus: event.data.attributes.data?.attributes?.status,
    });

    // 8. Process event asynchronously (don't wait)
    // This allows us to return 200 immediately to PayMongo
    processWebhookEvent(event).catch((error) => {
      console.error("[webhook] Failed to process event", {
        eventId: event.data.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // 9. Return 200 immediately to prevent PayMongo retries
    // We log any processing errors internally but don't fail the webhook
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("[webhook] Unexpected error", error);
    
    // Always return 200 to prevent webhook retries
    // Log the error for manual investigation
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

/**
 * Webhook route only accepts POST
 */
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Payment Validation Module
 * 
 * Validates payment inputs and enforces business rules.
 * All validation functions return { valid: boolean; error?: string }
 */

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate booking is eligible for payment
 */
export function validateBookingForPayment(booking: {
  status: string;
  total_amount: number;
  tourist_id: string;
}, currentUserId: string): ValidationResult {
  if (booking.tourist_id !== currentUserId) {
    return { valid: false, error: "You are not authorized to pay for this booking" };
  }

  if (booking.status !== "pending_payment") {
    return { 
      valid: false, 
      error: `Booking status is ${booking.status}, cannot initiate payment` 
    };
  }

  if (booking.total_amount <= 0) {
    return { valid: false, error: "Invalid booking amount" };
  }

  return { valid: true };
}

/**
 * Validate payment amount matches booking
 */
export function validatePaymentAmount(
  paymentAmount: number, 
  bookingAmount: number
): ValidationResult {
  if (Math.abs(paymentAmount - bookingAmount) > 0.01) {
    return { 
      valid: false, 
      error: "Payment amount does not match booking total" 
    };
  }

  return { valid: true };
}

/**
 * Generate idempotency key for payment
 */
export function generateIdempotencyKey(bookingId: string): string {
  const timestamp = Date.now();
  return `payment_${bookingId}_${timestamp}`;
}

/**
 * Validate idempotency key format
 */
export function validateIdempotencyKey(key: string): ValidationResult {
  const pattern = /^payment_[a-f0-9-]+_\d+$/;
  
  if (!pattern.test(key)) {
    return { valid: false, error: "Invalid idempotency key format" };
  }

  return { valid: true };
}

/**
 * Verify PayMongo webhook signature
 * Uses HMAC-SHA256 to validate webhook authenticity
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Convert pesos to centavos for PayMongo API
 */
export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * Convert centavos to pesos from PayMongo API
 */
export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}

/**
 * Format amount for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

/**
 * Map PayMongo error to user-friendly message
 */
export function mapGatewayError(error: any): string {
  const errorCode = error?.code || error?.type;

  const errorMessages: Record<string, string> = {
    'card_declined': 'Your card was declined. Please try another payment method.',
    'insufficient_funds': 'Insufficient funds. Please use a different payment method.',
    'expired_card': 'Your card has expired. Please use a different card.',
    'incorrect_cvc': 'The security code (CVC) is incorrect. Please check and try again.',
    'processing_error': 'Payment processing failed. Please try again.',
    'rate_limit': 'Too many payment attempts. Please try again in a few minutes.',
    'invalid_amount': 'Invalid payment amount. Please contact support.',
    'payment_intent_authentication_failure': 'Payment authentication failed. Please try again.',
  };

  return errorMessages[errorCode] || 'Payment failed. Please try again or contact support.';
}

/**
 * Check if transaction is still pending and within timeout
 */
export function isTransactionExpired(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
  
  return diffMinutes > 30;
}

/**
 * Validate payment method is supported
 */
export function validatePaymentMethod(method: string): ValidationResult {
  const supportedMethods = ['gcash', 'card', 'bank_transfer', 'paymaya', 'grabpay'];
  
  if (!supportedMethods.includes(method)) {
    return { 
      valid: false, 
      error: `Payment method ${method} is not supported` 
    };
  }

  return { valid: true };
}

import "server-only";

/**
 * Payment Engine Contract
 * 
 * Centralized data mapping between JavaScript (camelCase) and database (snake_case).
 * Database table: tours_payment_transactions
 * 
 * Use this file as the source of truth for field names. If the schema changes, update here first.
 */

export const PAYMENT_TRANSACTIONS_TABLE = "tours_payment_transactions";

/**
 * Field mapping: JavaScript → Database column names
 */
export const PAYMENT_FIELDS = {
  id: "id",
  bookingId: "booking_id",
  paymentToken: "payment_token",
  paymentMethod: "payment_method",
  amount: "amount",
  currency: "currency",
  status: "status",
  gatewayResponse: "gateway_response",
  idempotencyKey: "idempotency_key",
  refundedAmount: "refunded_amount",
  refundReason: "refund_reason",
  refundedAt: "refunded_at",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

/**
 * Payment status enum
 * 
 * State transitions:
 * pending → processing → completed
 * pending → processing → failed
 * pending → expired (timeout)
 * completed → refunded (future)
 */
export type PaymentStatus = 
  | "pending" 
  | "processing" 
  | "completed" 
  | "failed" 
  | "expired" 
  | "refunded";

/**
 * Payment method enum
 * Supported by PayMongo in Philippines
 */
export type PaymentMethod = 
  | "gcash" 
  | "card" 
  | "bank_transfer" 
  | "paymaya" 
  | "grabpay";

/**
 * Core transaction record
 */
export interface TransactionRecord {
  id: string;
  booking_id: string;
  payment_token: string | null;
  payment_method: PaymentMethod | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway_response: Record<string, any> | null;
  idempotency_key: string;
  refunded_amount: number;
  refund_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transaction with booking details (for display)
 */
export interface TransactionWithBooking extends TransactionRecord {
  bookings?: {
    id: string;
    package_id: string;
    booking_date: string;
    total_amount: number;
    tourist_id: string;
    packages?: {
      title: string;
      location_name: string;
      operator_id: string;
      profiles?: {
        full_name: string | null;
      };
    };
  };
}

/**
 * Transaction list query
 */
export const TRANSACTION_LIST_SELECT = `
  id,
  booking_id,
  payment_method,
  amount,
  currency,
  status,
  created_at,
  bookings(
    id,
    package_id,
    booking_date,
    packages(
      title,
      location_name,
      operator_id,
      profiles(full_name)
    )
  )
`;

/**
 * Transaction detail query
 */
export const TRANSACTION_DETAIL_SELECT = `
  id,
  booking_id,
  payment_token,
  payment_method,
  amount,
  currency,
  status,
  gateway_response,
  idempotency_key,
  refunded_amount,
  refund_reason,
  refunded_at,
  created_at,
  updated_at,
  bookings(
    id,
    package_id,
    booking_date,
    total_amount,
    tourist_id,
    packages(
      title,
      description,
      location_name,
      operator_id,
      profiles(full_name)
    )
  )
`;

/**
 * PayMongo checkout session request
 * Reference: https://developers.paymongo.com/reference/checkout-session-resource
 */
export interface PayMongoCheckoutSessionRequest {
  data: {
    attributes: {
      line_items: Array<{
        name: string;
        description?: string;
        amount: number; // in centavos
        currency: string;
        quantity: number;
      }>;
      payment_method_types: string[]; // e.g., ['gcash', 'card', 'paymaya']
      success_url: string;
      cancel_url: string;
      reference_number: string; // our booking_id
      description?: string;
      metadata?: Record<string, string>;
    };
  };
}

/**
 * PayMongo checkout session response
 */
export interface PayMongoCheckoutSessionResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      checkout_url: string;
      reference_number: string;
      status: string;
      payment_intent?: {
        id: string;
        attributes: {
          amount: number;
          currency: string;
          status: string;
          payment_method?: {
            type: string;
          };
        };
      };
    };
  };
}

/**
 * PayMongo webhook event
 * Reference: https://developers.paymongo.com/docs/webhooks
 */
export interface PayMongoWebhookEvent {
  data: {
    id: string;
    type: string; // e.g., "event"
    attributes: {
      type: string; // e.g., "payment.paid", "payment.failed"
      livemode: boolean;
      data: {
        id: string;
        type: string;
        attributes: {
          status: string;
          amount: number;
          currency: string;
          description?: string;
          source?: {
            type: string; // e.g., "gcash", "card"
          };
          billing?: Record<string, any>;
          metadata?: Record<string, string>;
        };
      };
      created_at: number;
      updated_at: number;
    };
  };
}

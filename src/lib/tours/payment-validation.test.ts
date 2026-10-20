import {
  validateBookingForPayment,
  validatePaymentAmount,
  generateIdempotencyKey,
  validateIdempotencyKey,
  verifyWebhookSignature,
  pesosToCentavos,
  centavosToPesos,
  formatCurrency,
  mapGatewayError,
  isTransactionExpired,
  validatePaymentMethod,
} from "./payment-validation";

describe("Payment Validation", () => {
  describe("validateBookingForPayment", () => {
    it("should reject booking not owned by user", () => {
      const booking = {
        status: "pending_payment",
        total_amount: 1000,
        tourist_id: "user1",
      };
      
      const result = validateBookingForPayment(booking, "user2");
      
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/not authorized/i);
    });

    it("should reject booking with non-pending status", () => {
      const booking = {
        status: "completed",
        total_amount: 1000,
        tourist_id: "user1",
      };
      
      const result = validateBookingForPayment(booking, "user1");
      
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/status is completed/i);
    });

    it("should reject booking with invalid amount", () => {
      const booking = {
        status: "pending_payment",
        total_amount: 0,
        tourist_id: "user1",
      };
      
      const result = validateBookingForPayment(booking, "user1");
      
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid.*amount/i);
    });

    it("should accept valid booking", () => {
      const booking = {
        status: "pending_payment",
        total_amount: 2500,
        tourist_id: "user1",
      };
      
      const result = validateBookingForPayment(booking, "user1");
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("validatePaymentAmount", () => {
    it("should reject mismatched amounts", () => {
      const result = validatePaymentAmount(1000, 1500);
      
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/does not match/i);
    });

    it("should accept matching amounts", () => {
      const result = validatePaymentAmount(2500, 2500);
      
      expect(result.valid).toBe(true);
    });

    it("should accept amounts within 0.01 tolerance", () => {
      const result = validatePaymentAmount(2500.00, 2500.001);
      
      expect(result.valid).toBe(true);
    });
  });

  describe("generateIdempotencyKey", () => {
    it("should generate key with correct format", () => {
      const bookingId = "b1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const key = generateIdempotencyKey(bookingId);
      
      expect(key).toMatch(/^payment_b1b2c3d4-e5f6-7890-abcd-ef1234567890_\d+$/);
    });

    it("should generate unique keys for same booking", () => {
      const bookingId = "test-booking-id";
      const key1 = generateIdempotencyKey(bookingId);
      
      // Wait 1ms to ensure different timestamp
      return new Promise(resolve => setTimeout(() => {
        const key2 = generateIdempotencyKey(bookingId);
        expect(key1).not.toBe(key2);
        resolve(undefined);
      }, 1));
    });
  });

  describe("validateIdempotencyKey", () => {
    it("should accept valid key format", () => {
      const key = "payment_b1b2c3d4-e5f6-7890-abcd-ef1234567890_1634567890123";
      const result = validateIdempotencyKey(key);
      
      expect(result.valid).toBe(true);
    });

    it("should reject invalid prefix", () => {
      const key = "invalid_b1b2c3d4-e5f6-7890-abcd-ef1234567890_1634567890123";
      const result = validateIdempotencyKey(key);
      
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid/i);
    });

    it("should reject missing timestamp", () => {
      const key = "payment_b1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const result = validateIdempotencyKey(key);
      
      expect(result.valid).toBe(false);
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should verify valid signature", () => {
      const payload = '{"event":"payment.paid","data":{}}';
      const secret = "test_webhook_secret";
      
      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      const result = verifyWebhookSignature(payload, validSignature, secret);
      
      expect(result).toBe(true);
    });

    it("should reject invalid signature", () => {
      const payload = '{"event":"payment.paid","data":{}}';
      const secret = "test_webhook_secret";
      const invalidSignature = "invalid_signature_12345";
      
      const result = verifyWebhookSignature(payload, invalidSignature, secret);
      
      expect(result).toBe(false);
    });

    it("should reject signature with wrong secret", () => {
      const payload = '{"event":"payment.paid","data":{}}';
      const secret1 = "test_webhook_secret";
      const secret2 = "different_secret";
      
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secret1)
        .update(payload)
        .digest('hex');
      
      const result = verifyWebhookSignature(payload, signature, secret2);
      
      expect(result).toBe(false);
    });
  });

  describe("pesosToCentavos", () => {
    it("should convert pesos to centavos", () => {
      expect(pesosToCentavos(100)).toBe(10000);
      expect(pesosToCentavos(25.50)).toBe(2550);
      expect(pesosToCentavos(1.99)).toBe(199);
    });

    it("should round to nearest centavo", () => {
      expect(pesosToCentavos(25.505)).toBe(2551);
      expect(pesosToCentavos(25.504)).toBe(2550);
    });
  });

  describe("centavosToPesos", () => {
    it("should convert centavos to pesos", () => {
      expect(centavosToPesos(10000)).toBe(100);
      expect(centavosToPesos(2550)).toBe(25.50);
      expect(centavosToPesos(199)).toBe(1.99);
    });
  });

  describe("formatCurrency", () => {
    it("should format currency in PHP", () => {
      expect(formatCurrency(2500)).toMatch(/₱.*2,500/);
      expect(formatCurrency(1500.50)).toMatch(/₱.*1,500\.50/);
    });

    it("should include comma separators", () => {
      expect(formatCurrency(10000)).toMatch(/10,000/);
    });
  });

  describe("mapGatewayError", () => {
    it("should map known error codes", () => {
      expect(mapGatewayError({ code: 'card_declined' })).toMatch(/card was declined/i);
      expect(mapGatewayError({ code: 'insufficient_funds' })).toMatch(/insufficient funds/i);
      expect(mapGatewayError({ code: 'expired_card' })).toMatch(/expired/i);
    });

    it("should return default message for unknown errors", () => {
      const message = mapGatewayError({ code: 'unknown_error' });
      expect(message).toMatch(/failed.*try again/i);
    });

    it("should handle missing error code", () => {
      const message = mapGatewayError({});
      expect(message).toMatch(/failed/i);
    });
  });

  describe("isTransactionExpired", () => {
    it("should detect expired transaction (>30 minutes)", () => {
      const oldDate = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      const result = isTransactionExpired(oldDate.toISOString());
      
      expect(result).toBe(true);
    });

    it("should detect non-expired transaction (<30 minutes)", () => {
      const recentDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const result = isTransactionExpired(recentDate.toISOString());
      
      expect(result).toBe(false);
    });

    it("should handle exactly 30 minutes", () => {
      const exactDate = new Date(Date.now() - 30 * 60 * 1000); // exactly 30 minutes
      const result = isTransactionExpired(exactDate.toISOString());
      
      expect(result).toBe(false);
    });
  });

  describe("validatePaymentMethod", () => {
    it("should accept supported payment methods", () => {
      expect(validatePaymentMethod('gcash').valid).toBe(true);
      expect(validatePaymentMethod('card').valid).toBe(true);
      expect(validatePaymentMethod('bank_transfer').valid).toBe(true);
      expect(validatePaymentMethod('paymaya').valid).toBe(true);
      expect(validatePaymentMethod('grabpay').valid).toBe(true);
    });

    it("should reject unsupported payment methods", () => {
      const result = validatePaymentMethod('bitcoin');
      
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/not supported/i);
    });
  });
});

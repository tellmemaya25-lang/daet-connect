import { POST, GET } from "./route";
import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/tours/payment-validation";
import { processWebhookEvent } from "@/app/(subsystems)/tours/tourist/payments/webhook-processor";
import type { PayMongoWebhookEvent } from "@/lib/tours/payment-contract";

// Mock dependencies
jest.mock("@/lib/tours/payment-validation");
jest.mock("@/app/(subsystems)/tours/tourist/payments/webhook-processor");

describe("POST /api/webhooks/payment", () => {
  const mockSecret = "test-webhook-secret";
  const mockPayload = JSON.stringify({
    data: {
      id: "event_12345",
      type: "event",
      attributes: {
        type: "payment.paid",
        data: {
          id: "pay_123456",
          type: "payment",
          attributes: {
            status: "paid",
            amount: 50000,
            currency: "PHP",
            source: {
              type: "gcash",
            },
          },
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYMONGO_WEBHOOK_SECRET = mockSecret;
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return 401 when signature header is missing", async () => {
    const request = {
      text: jest.fn().mockResolvedValue(mockPayload),
      headers: new Map([]),
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Missing signature" });
  });

  it("should return 500 when webhook secret is not configured", async () => {
    delete process.env.PAYMONGO_WEBHOOK_SECRET;

    const mockHeaders = new Map([["paymongo-signature", "test-signature"]]);
    const request = {
      text: jest.fn().mockResolvedValue(mockPayload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Server configuration error" });
  });

  it("should return 401 when signature is invalid", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(false);

    const mockHeaders = new Map([["paymongo-signature", "invalid-signature"]]);
    const request = {
      text: jest.fn().mockResolvedValue(mockPayload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(verifyWebhookSignature).toHaveBeenCalledWith(
      mockPayload,
      "invalid-signature",
      mockSecret
    );
  });

  it("should return 200 when payload is invalid JSON", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);

    const mockHeaders = new Map([["paymongo-signature", "valid-signature"]]);
    const request = {
      text: jest.fn().mockResolvedValue("invalid json {"),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });

  it("should return 200 when event has invalid structure", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);

    const invalidPayload = JSON.stringify({
      data: {
        id: "event_12345",
        // Missing attributes or invalid structure
      },
    });

    const mockHeaders = new Map([["paymongo-signature", "valid-signature"]]);
    const request = {
      text: jest.fn().mockResolvedValue(invalidPayload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });

  it("should process valid webhook event and return 200 immediately", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    (processWebhookEvent as jest.Mock).mockResolvedValue(undefined);

    const mockHeaders = new Map([["paymongo-signature", "valid-signature"]]);
    const request = {
      text: jest.fn().mockResolvedValue(mockPayload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    // processWebhookEvent should be called but we don't wait for it
    // Give it a tick to execute
    await new Promise((resolve) => setImmediate(resolve));
    expect(processWebhookEvent).toHaveBeenCalled();
  });

  it("should handle webhook event processing error gracefully", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    (processWebhookEvent as jest.Mock).mockRejectedValue(new Error("Processing failed"));

    const mockHeaders = new Map([["paymongo-signature", "valid-signature"]]);
    const request = {
      text: jest.fn().mockResolvedValue(mockPayload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    // Should still return 200 to avoid webhook retries
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });

  it("should verify webhook signature with correct parameters", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);

    const testSignature = "test-sig-12345";
    const mockHeaders = new Map([["paymongo-signature", testSignature]]);
    const request = {
      text: jest.fn().mockResolvedValue(mockPayload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    await POST(request);

    expect(verifyWebhookSignature).toHaveBeenCalledWith(
      mockPayload,
      testSignature,
      mockSecret
    );
  });

  it("should log webhook events with correct details", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    const mockLog = jest.spyOn(console, "log");

    const mockHeaders = new Map([["paymongo-signature", "valid-signature"]]);
    const request = {
      text: jest.fn().mockResolvedValue(mockPayload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    await POST(request);

    expect(mockLog).toHaveBeenCalledWith(
      "[webhook] Received payment event",
      expect.objectContaining({
        eventId: "event_12345",
        eventType: "payment.paid",
        paymentId: "pay_123456",
        paymentStatus: "paid",
      })
    );
  });

  it("should return 200 on unexpected errors", async () => {
    const mockHeaders = new Map([["paymongo-signature", "valid-signature"]]);
    const request = {
      text: jest.fn().mockRejectedValue(new Error("Read error")),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });
});

describe("GET /api/webhooks/payment", () => {
  it("should return 405 Method Not Allowed", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });
});

describe("Webhook Event Processing Integration", () => {
  const mockSecret = "test-webhook-secret";

  beforeEach(() => {
    process.env.PAYMONGO_WEBHOOK_SECRET = mockSecret;
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should process payment.paid event", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    (processWebhookEvent as jest.Mock).mockResolvedValue(undefined);

    const paidEvent: PayMongoWebhookEvent = {
      data: {
        id: "event_paid_123",
        type: "event",
        attributes: {
          type: "payment.paid",
          livemode: true,
          data: {
            id: "pay_paid_456",
            type: "payment",
            attributes: {
              status: "paid",
              amount: 75000,
              currency: "PHP",
              source: { type: "card" },
            },
          },
          created_at: Date.now() / 1000,
          updated_at: Date.now() / 1000,
        },
      },
    };

    const payload = JSON.stringify(paidEvent);
    const mockHeaders = new Map([["paymongo-signature", "valid-sig"]]);
    const request = {
      text: jest.fn().mockResolvedValue(payload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    await new Promise((resolve) => setImmediate(resolve));
    expect(processWebhookEvent).toHaveBeenCalledWith(paidEvent);
  });

  it("should process payment.failed event", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    (processWebhookEvent as jest.Mock).mockResolvedValue(undefined);

    const failedEvent: PayMongoWebhookEvent = {
      data: {
        id: "event_failed_789",
        type: "event",
        attributes: {
          type: "payment.failed",
          livemode: true,
          data: {
            id: "pay_failed_012",
            type: "payment",
            attributes: {
              status: "failed",
              amount: 50000,
              currency: "PHP",
              source: { type: "gcash" },
            },
          },
          created_at: Date.now() / 1000,
          updated_at: Date.now() / 1000,
        },
      },
    };

    const payload = JSON.stringify(failedEvent);
    const mockHeaders = new Map([["paymongo-signature", "valid-sig"]]);
    const request = {
      text: jest.fn().mockResolvedValue(payload),
      headers: mockHeaders,
      nextUrl: { pathname: "/api/webhooks/payment" },
      ip: "127.0.0.1",
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    await new Promise((resolve) => setImmediate(resolve));
    expect(processWebhookEvent).toHaveBeenCalledWith(failedEvent);
  });

  it("should be idempotent - duplicate events", async () => {
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);
    (processWebhookEvent as jest.Mock).mockResolvedValue(undefined);

    const event: PayMongoWebhookEvent = {
      data: {
        id: "event_idempotent_123",
        type: "event",
        attributes: {
          type: "payment.paid",
          livemode: true,
          data: {
            id: "pay_idempotent_456",
            type: "payment",
            attributes: {
              status: "paid",
              amount: 100000,
              currency: "PHP",
              source: { type: "paymaya" },
            },
          },
          created_at: Date.now() / 1000,
          updated_at: Date.now() / 1000,
        },
      },
    };

    const payload = JSON.stringify(event);
    const mockHeaders = new Map([["paymongo-signature", "valid-sig"]]);

    // Send same event twice
    for (let i = 0; i < 2; i++) {
      const request = {
        text: jest.fn().mockResolvedValue(payload),
        headers: new Map(mockHeaders),
        nextUrl: { pathname: "/api/webhooks/payment" },
        ip: "127.0.0.1",
      } as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(200);
    }

    // Both should return 200 (webhook route doesn't dedupe, processor does)
    await new Promise((resolve) => setImmediate(resolve));
  });
});

import {
  createPaymentSession,
  getTransactionStatus,
  getTouristTransactions,
  getTransactionDetail,
} from "./actions";
import * as auth from "@/lib/tours/server-auth";
import * as supabase from "@/lib/supabase/server";

// Mock dependencies
jest.mock("@/lib/tours/server-auth");
jest.mock("@/lib/supabase/server");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock fetch for PayMongo API
global.fetch = jest.fn();

describe("Payment Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYMONGO_SECRET_KEY = "sk_test_mock_key";
    process.env.PAYMENT_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    delete process.env.PAYMONGO_SECRET_KEY;
    delete process.env.PAYMENT_TEST_MODE;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  describe("createPaymentSession", () => {
    const mockBooking = {
      id: "booking-1",
      tourist_id: "user-1",
      total_amount: 2500,
      status: "pending_payment",
      package_id: "package-1",
      booking_date: "2026-11-15",
      packages: {
        title: "Dahican Beach Tour",
        location_name: "Dahican Beach",
      },
    };

    const mockPayMongoResponse = {
      data: {
        id: "cs_test_123",
        attributes: {
          checkout_url: "https://checkout.paymongo.com/cs_test_123",
          reference_number: "booking-1",
          status: "active",
        },
      },
    };

    it("should require authentication", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: null,
        role: null,
        error: null,
      });

      const result = await createPaymentSession("booking-1");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/signed in/i);
    });

    it("should reject non-existent booking", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const result = await createPaymentSession("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it("should reject booking not owned by user", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-2" } as any,
        role: "tourist",
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBooking, error: null }),
        gte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis(),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const result = await createPaymentSession("booking-1");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not authorized/i);
    });

    it("should reject booking with non-pending status", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const completedBooking = { ...mockBooking, status: "completed" };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: completedBooking, error: null }),
        gte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const result = await createPaymentSession("booking-1");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/cannot initiate payment/i);
    });

    it("should create payment session successfully", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBooking, error: null }),
        gte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis(),
      };

      mockSupabase.insert.mockReturnValue({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({
          data: { id: "transaction-1" },
          error: null,
        }),
      });

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPayMongoResponse,
      });

      const result = await createPaymentSession("booking-1");

      expect(result.success).toBe(true);
      expect(result.data?.checkoutUrl).toBe("https://checkout.paymongo.com/cs_test_123");
      expect(result.data?.transactionId).toBe("transaction-1");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.paymongo.com/v1/checkout_sessions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should return existing session for duplicate idempotency key", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const existingTransaction = {
        id: "transaction-existing",
        payment_token: "cs_test_existing",
        status: "pending",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBooking, error: null }),
        gte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: existingTransaction, error: null }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPayMongoResponse,
      });

      const result = await createPaymentSession("booking-1");

      expect(result.success).toBe(true);
      expect(result.data?.transactionId).toBe("transaction-existing");
      // Should call PayMongo to retrieve existing checkout URL
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("getTransactionStatus", () => {
    it("should require authentication", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: null,
        role: null,
        error: null,
      });

      const result = await getTransactionStatus("transaction-1");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/signed in/i);
    });

    it("should return transaction status", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const mockTransaction = {
        id: "transaction-1",
        booking_id: "booking-1",
        status: "completed",
        amount: 2500,
        bookings: { tourist_id: "user-1" },
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const result = await getTransactionStatus("transaction-1");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("completed");
      expect(result.data?.amount).toBe(2500);
    });

    it("should reject unauthorized access", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-2" } as any,
        role: "tourist",
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const result = await getTransactionStatus("transaction-1");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });
  });

  describe("getTouristTransactions", () => {
    it("should require authentication", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: null,
        role: null,
        error: null,
      });

      const result = await getTouristTransactions();

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/signed in/i);
    });

    it("should return paginated transactions", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const mockTransactions = [
        { id: "transaction-1", amount: 2500, status: "completed" },
        { id: "transaction-2", amount: 3500, status: "pending" },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockTransactions, error: null }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const result = await getTouristTransactions(1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);
    });

    it("should handle pagination correctly", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      await getTouristTransactions(2, 20);

      expect(mockSupabase.range).toHaveBeenCalledWith(20, 39);
    });
  });

  describe("getTransactionDetail", () => {
    it("should require authentication", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: null,
        role: null,
        error: null,
      });

      const result = await getTransactionDetail("transaction-1");

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/signed in/i);
    });

    it("should return full transaction details", async () => {
      jest.mocked(auth.getAuthenticatedSession).mockResolvedValue({
        user: { id: "user-1" } as any,
        role: "tourist",
        error: null,
      });

      const mockTransaction = {
        id: "transaction-1",
        booking_id: "booking-1",
        status: "completed",
        amount: 2500,
        gateway_response: { session_id: "cs_test_123" },
        bookings: {
          id: "booking-1",
          packages: {
            title: "Tour Package",
          },
        },
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null }),
      };

      jest.mocked(supabase.createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const result = await getTransactionDetail("transaction-1");

      expect(result.success).toBe(true);
      expect(result.data?.gateway_response).toBeDefined();
      expect(result.data?.bookings?.packages?.title).toBe("Tour Package");
    });
  });
});

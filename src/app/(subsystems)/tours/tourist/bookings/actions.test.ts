import {
  validateBookingRequest,
  validateBookingDate,
  validatePriceVariant,
  validateGroupSize,
  validateFutureDate,
} from "@/lib/tours/booking-validation";

/**
 * Test Suite: Booking Validators
 * 
 * These tests verify that input validation works correctly.
 * They run with: npm test
 */

describe("Booking Validators", () => {
  describe("validateBookingRequest", () => {
    it("should reject null input", () => {
      const error = validateBookingRequest(null);
      expect(error).toBeTruthy();
    });

    it("should reject undefined input", () => {
      const error = validateBookingRequest(undefined);
      expect(error).toBeTruthy();
    });

    it("should reject empty object", () => {
      const error = validateBookingRequest({});
      expect(error).toMatch(/package/i);
    });

    it("should reject missing packageId", () => {
      const error = validateBookingRequest({
        guideId: "guide-123",
        bookingDate: "2026-12-01",
        priceVariantId: "variant-123",
      });
      expect(error).toMatch(/package/i);
    });

    it("should reject missing guideId", () => {
      const error = validateBookingRequest({
        packageId: "package-123",
        bookingDate: "2026-12-01",
        priceVariantId: "variant-123",
      });
      expect(error).toMatch(/guide/i);
    });

    it("should reject missing bookingDate", () => {
      const error = validateBookingRequest({
        packageId: "package-123",
        guideId: "guide-123",
        priceVariantId: "variant-123",
      });
      expect(error).toMatch(/booking date/i);
    });

    it("should reject missing priceVariantId", () => {
      const error = validateBookingRequest({
        packageId: "package-123",
        guideId: "guide-123",
        bookingDate: "2026-12-01",
      });
      expect(error).toMatch(/price option/i);
    });

    it("should reject invalid date format", () => {
      const error = validateBookingRequest({
        packageId: "package-123",
        guideId: "guide-123",
        bookingDate: "12/01/2026", // Wrong format
        priceVariantId: "variant-123",
      });
      expect(error).toMatch(/date format/i);
    });

    it("should reject empty string fields", () => {
      const error = validateBookingRequest({
        packageId: "",
        guideId: "guide-123",
        bookingDate: "2026-12-01",
        priceVariantId: "variant-123",
      });
      expect(error).toBeTruthy();
    });

    it("should accept valid input", () => {
      const error = validateBookingRequest({
        packageId: "package-123",
        guideId: "guide-123",
        bookingDate: "2026-12-01",
        priceVariantId: "variant-123",
      });
      expect(error).toBeNull();
    });

    it("should accept valid input with extra fields", () => {
      const error = validateBookingRequest({
        packageId: "package-123",
        guideId: "guide-123",
        bookingDate: "2026-12-01",
        priceVariantId: "variant-123",
        extraField: "should be ignored",
      });
      expect(error).toBeNull();
    });
  });

  describe("validateBookingDate", () => {
    it("should reject past dates", () => {
      const today = "2026-11-01";
      const pastDate = "2026-10-01";
      const error = validateBookingDate(today, pastDate);
      expect(error).toMatch(/future/i);
    });

    it("should accept today's date", () => {
      const today = "2026-11-01";
      const error = validateBookingDate(today, today);
      expect(error).toBeNull();
    });

    it("should accept future dates", () => {
      const today = "2026-11-01";
      const futureDate = "2026-12-01";
      const error = validateBookingDate(today, futureDate);
      expect(error).toBeNull();
    });

    it("should reject invalid format", () => {
      const today = "2026-11-01";
      const invalidDate = "11-01-2026";
      const error = validateBookingDate(today, invalidDate);
      expect(error).toMatch(/format/i);
    });

    it("should reject empty date", () => {
      const today = "2026-11-01";
      const error = validateBookingDate(today, "");
      expect(error).toBeTruthy();
    });
  });

  describe("validatePriceVariant", () => {
    it("should reject when both prices are null", () => {
      const error = validatePriceVariant(null, null);
      expect(error).toMatch(/price must be set/i);
    });

    it("should accept per-person price", () => {
      const error = validatePriceVariant(500, null);
      expect(error).toBeNull();
    });

    it("should accept flat price", () => {
      const error = validatePriceVariant(null, 5000);
      expect(error).toBeNull();
    });

    it("should accept both prices set", () => {
      const error = validatePriceVariant(500, 5000);
      expect(error).toBeNull();
    });

    it("should reject negative per-person price", () => {
      const error = validatePriceVariant(-500, null);
      expect(error).toMatch(/negative/i);
    });

    it("should reject negative flat price", () => {
      const error = validatePriceVariant(null, -5000);
      expect(error).toMatch(/negative/i);
    });

    it("should accept zero price", () => {
      const error = validatePriceVariant(0, null);
      expect(error).toBeNull();
    });
  });

  describe("validateGroupSize", () => {
    it("should reject zero min pax", () => {
      const error = validateGroupSize(0);
      expect(error).toMatch(/at least 1/i);
    });

    it("should reject negative min pax", () => {
      const error = validateGroupSize(-5);
      expect(error).toMatch(/at least 1/i);
    });

    it("should accept valid min pax", () => {
      const error = validateGroupSize(1);
      expect(error).toBeNull();
    });

    it("should accept large group sizes", () => {
      const error = validateGroupSize(100);
      expect(error).toBeNull();
    });

    it("should check selected count against min pax", () => {
      const error = validateGroupSize(5, 3); // Need 5, selected 3
      expect(error).toMatch(/minimum 5/i);
    });

    it("should accept when selected meets minimum", () => {
      const error = validateGroupSize(5, 5);
      expect(error).toBeNull();
    });

    it("should accept when selected exceeds minimum", () => {
      const error = validateGroupSize(5, 10);
      expect(error).toBeNull();
    });
  });

  describe("validateFutureDate", () => {
    it("should reject empty date", () => {
      const error = validateFutureDate("");
      expect(error).toMatch(/required/i);
    });

    it("should reject past dates", () => {
      const error = validateFutureDate("2020-01-01");
      expect(error).toMatch(/today or in the future/i);
    });

    it("should accept today", () => {
      const today = new Date().toISOString().split("T")[0];
      const error = validateFutureDate(today);
      expect(error).toBeNull();
    });

    it("should accept future dates", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString().split("T")[0]; // Tomorrow
      const error = validateFutureDate(futureDate);
      expect(error).toBeNull();
    });
  });
});

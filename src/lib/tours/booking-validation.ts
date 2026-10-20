/**
 * Booking Engine Validators
 * 
 * These validators check user input BEFORE sending to the database.
 * They return error message (string) if invalid, null if valid.
 * 
 * Rule: Validate early, fail fast, return specific error messages to the user.
 */

/**
 * Validate booking date is in the future
 * 
 * @param todayDate - Today's date (YYYY-MM-DD format)
 * @param bookingDate - Proposed booking date (YYYY-MM-DD format)
 * @returns Error message or null if valid
 */
export function validateBookingDate(todayDate: string, bookingDate: string): string | null {
  if (!bookingDate || typeof bookingDate !== "string") {
    return "Booking date is required";
  }

  // Check format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return "Invalid date format. Use YYYY-MM-DD";
  }

  // Must be future date (today or later)
  if (bookingDate < todayDate) {
    return "Booking date must be in the future";
  }

  return null;
}

/**
 * Validate booking request input
 * 
 * @param input - User input object
 * @returns Error message or null if valid
 */
export function validateBookingRequest(input: unknown): string | null {
  if (!input || typeof input !== "object") {
    return "Invalid input";
  }

  const data = input as Record<string, unknown>;

  // Check packageId
  if (!data.packageId || typeof data.packageId !== "string") {
    return "Package is required";
  }

  if (data.packageId.trim().length === 0) {
    return "Package cannot be empty";
  }

  // Check guideId
  if (!data.guideId || typeof data.guideId !== "string") {
    return "Guide is required";
  }

  if (data.guideId.trim().length === 0) {
    return "Guide cannot be empty";
  }

  // Check bookingDate
  if (!data.bookingDate || typeof data.bookingDate !== "string") {
    return "Booking date is required";
  }

  // Check date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.bookingDate)) {
    return "Invalid date format. Use YYYY-MM-DD";
  }

  // Check priceVariantId (optional in some cases, but required for booking)
  if (!data.priceVariantId || typeof data.priceVariantId !== "string") {
    return "Price option is required";
  }

  if (data.priceVariantId.trim().length === 0) {
    return "Price option cannot be empty";
  }

  return null; // Valid
}

/**
 * Validate price variant selection
 * 
 * @param pricePerPax - Per-person price (nullable)
 * @param flatPrice - Flat total price (nullable)
 * @returns Error message or null if valid
 */
export function validatePriceVariant(
  pricePerPax: number | null,
  flatPrice: number | null
): string | null {
  // At least one must be set
  if (pricePerPax === null && flatPrice === null) {
    return "Price must be set (either per-person or flat)";
  }

  // Both must be non-negative if set
  if (pricePerPax !== null && pricePerPax < 0) {
    return "Per-person price cannot be negative";
  }

  if (flatPrice !== null && flatPrice < 0) {
    return "Flat price cannot be negative";
  }

  return null; // Valid
}

/**
 * Validate minimum group size for booking
 * 
 * @param minPax - Minimum people required
 * @param selectedCount - Number of people selected (if applicable)
 * @returns Error message or null if valid
 */
export function validateGroupSize(minPax: number, selectedCount?: number): string | null {
  if (minPax < 1) {
    return "Minimum group size must be at least 1";
  }

  if (selectedCount !== undefined && selectedCount < minPax) {
    return `Minimum ${minPax} people required for this package`;
  }

  return null;
}

/**
 * Validate date is today or in the future
 * 
 * @param dateString - Date to check (YYYY-MM-DD format)
 * @returns Error message or null if valid
 */
export function validateFutureDate(dateString: string): string | null {
  if (!dateString) {
    return "Date is required";
  }

  const today = new Date().toISOString().split("T")[0];
  if (dateString < today) {
    return "Date must be today or in the future";
  }

  return null;
}

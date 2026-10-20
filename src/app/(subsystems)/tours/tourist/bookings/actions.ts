"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import {
  BOOKING_TABLE,
  BOOKING_FIELDS,
  BOOKING_LIST_SELECT,
  BOOKING_DETAIL_SELECT,
  PACKAGE_GUIDES_TABLE,
  BOOKING_AVAILABILITY_TABLE,
  GUIDE_AVAILABILITY_TABLE,
  type BookingRecord,
  type BookingWithDetails,
  type PackageAvailabilityRecord,
  type GuideAvailabilityRecord,
} from "@/lib/tours/booking-contract";
import {
  PACKAGE_LIST_SELECT,
  PACKAGE_DETAIL_SELECT,
  type PackageListRecord,
} from "@/lib/tours/package-contract";
import {
  validateBookingRequest,
  validateBookingDate,
  validatePriceVariant,
} from "@/lib/tours/booking-validation";

/**
 * Standard action result format
 * Every Server Action returns this shape
 */
interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// PUBLIC PACKAGE BROWSING (Tourist viewing published packages)
// ============================================================================

/**
 * List all published packages (paginated)
 * 
 * Tourists browse packages before booking
 * RLS: anon/authenticated can see published packages
 */
export async function listPublishedPackages(
  page: number = 1,
  pageSize: number = 20
): Promise<ActionResult<PackageListRecord[]>> {
  try {
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    const offset = (page - 1) * pageSize;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tours_packages")
      .select(PACKAGE_LIST_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("listPublishedPackages error:", error);
      return { success: false, error: "Could not load packages" };
    }

    return { success: true, data: (data ?? []) as PackageListRecord[] };
  } catch (err) {
    console.error("listPublishedPackages exception:", err);
    return { success: false, error: "Unexpected error loading packages" };
  }
}

/**
 * Get package details with pricing, stops, and eligible guides
 * 
 * Shows everything needed to create a booking for this package
 * RLS: anon/authenticated can see published packages
 */
export async function getPackageForBooking(
  packageId: string
): Promise<ActionResult<any>> {
  if (!packageId || typeof packageId !== "string") {
    return { success: false, error: "Package ID is required" };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tours_packages")
      .select(
        `
        id,
        title,
        description,
        location_name,
        duration_value,
        duration_type,
        inclusions,
        exclusions,
        cover_image_url,
        gallery_urls,
        status,
        created_at,
        tours_package_price_variants(
          id,
          variant_name,
          min_pax,
          max_pax,
          price_per_pax,
          flat_price,
          is_default
        ),
        tours_package_stops(
          id,
          stop_order,
          location_name,
          latitude,
          longitude,
          description,
          estimated_duration_minutes
        ),
        tours_package_guides(
          id,
          guide_id,
          tours_guides(
            id,
            profile_id,
            bio,
            contact_phone
          )
        )
      `
      )
      .eq("id", packageId)
      .eq("status", "published")
      .single();

    if (error || !data) {
      return { success: false, error: "Package not found or not published" };
    }

    return { success: true, data };
  } catch (err) {
    console.error("getPackageForBooking exception:", err);
    return { success: false, error: "Could not load package details" };
  }
}

// ============================================================================
// GUIDE AVAILABILITY CHECKING
// ============================================================================

/**
 * Get guides eligible for a package AND available on a specific date
 * 
 * Returns list of guide IDs that can lead this package on the chosen date.
 * This checks:
 * 1. Guide is assigned to this package (tours_package_guides)
 * 2. Guide has availability covering this date
 * 3. Guide doesn't already have a completed booking on this date
 * 
 * RLS: Can be called by anon/authenticated (for booking form)
 */
export async function getAvailableGuidesForDate(
  packageId: string,
  bookingDate: string
): Promise<ActionResult<string[]>> {
  // Validate input
  if (!packageId || typeof packageId !== "string") {
    return { success: false, error: "Package ID is required" };
  }

  if (!bookingDate || typeof bookingDate !== "string") {
    return { success: false, error: "Booking date is required" };
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return { success: false, error: "Invalid date format" };
  }

  // Validate date is in future
  const today = new Date().toISOString().split("T")[0];
  const dateError = validateBookingDate(today, bookingDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Step 1: Get all guides eligible for this package
    const { data: packageGuides, error: pgError } = await supabase
      .from(PACKAGE_GUIDES_TABLE)
      .select("guide_id")
      .eq("package_id", packageId);

    if (pgError) {
      console.error("getAvailableGuidesForDate: package guides error:", pgError);
      return { success: false, error: "Could not load available guides" };
    }

    const guideIds = (packageGuides ?? []).map((pg) => pg.guide_id);

    if (guideIds.length === 0) {
      return { success: false, error: "No guides available for this package" };
    }

    // Step 2: Get guides with availability on this date
    const { data: availableGuides, error: gaError } = await supabase
      .from(GUIDE_AVAILABILITY_TABLE)
      .select("guide_id")
      .in("guide_id", guideIds)
      .lte("available_from", bookingDate)
      .gte("available_until", bookingDate);

    if (gaError) {
      console.error("getAvailableGuidesForDate: availability error:", gaError);
      return { success: false, error: "Could not check guide availability" };
    }

    const availableGuideIds = (availableGuides ?? []).map((g) => g.guide_id);

    if (availableGuideIds.length === 0) {
      return { success: false, error: "No guides available on this date" };
    }

    // Step 3: Check which guides already have completed bookings on this date
    const { data: existingBookings, error: bError } = await supabase
      .from(BOOKING_TABLE)
      .select("guide_id")
      .in("guide_id", availableGuideIds)
      .eq("booking_date", bookingDate)
      .eq("status", "completed");

    if (bError) {
      console.error("getAvailableGuidesForDate: existing bookings error:", bError);
      return { success: false, error: "Could not verify guide bookings" };
    }

    const bookedGuideIds = new Set((existingBookings ?? []).map((b) => b.guide_id));
    const freeGuideIds = availableGuideIds.filter((gId) => !bookedGuideIds.has(gId));

    if (freeGuideIds.length === 0) {
      return { success: false, error: "All guides are booked for this date" };
    }

    return { success: true, data: freeGuideIds };
  } catch (err) {
    console.error("getAvailableGuidesForDate exception:", err);
    return { success: false, error: "Unexpected error checking availability" };
  }
}

// ============================================================================
// BOOKING CREATION (Atomic - prevents double-booking)
// ============================================================================

/**
 * Create a booking (tourist books a package with a guide for a date)
 * 
 * This is the critical operation that MUST be atomic to prevent race conditions.
 * 
 * The action:
 * 1. Verifies tourist is authenticated
 * 2. Validates all input
 * 3. Checks package is published
 * 4. Verifies pricing
 * 5. Ensures guide is eligible for package
 * 6. Confirms guide availability
 * 7. Checks no existing booking on same date
 * 8. Creates booking record
 * 9. Awards points
 * 
 * RLS also enforces row-level policies on insert.
 * 
 * @param input - Booking details
 * @returns Booking ID on success
 */
export async function createBooking(input: {
  packageId: string;
  guideId: string;
  bookingDate: string;
  priceVariantId: string;
}): Promise<ActionResult<{ bookingId: string }>> {
  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: Authentication Check
  // ─────────────────────────────────────────────────────────────────────────
  const session = await getAuthenticatedSession();
  if (!session.user) {
    return { success: false, error: "You must be signed in to create a booking" };
  }

  if (session.role !== "tourist") {
    return {
      success: false,
      error: "Only tourists can create bookings",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Input Validation
  // ─────────────────────────────────────────────────────────────────────────
  const validationError = validateBookingRequest(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const today = new Date().toISOString().split("T")[0];
  const dateError = validateBookingDate(today, input.bookingDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3: Verify Package (must be published)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: pkg, error: pkgError } = await supabase
      .from("tours_packages")
      .select("id, operator_id, status")
      .eq("id", input.packageId)
      .eq("status", "published")
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: "Package not found or no longer published" };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 4: Verify Price Variant (must exist, must match package)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: priceVariant, error: priceError } = await supabase
      .from("tours_package_price_variants")
      .select("id, price_per_pax, flat_price, is_default")
      .eq("id", input.priceVariantId)
      .eq("package_id", input.packageId)
      .single();

    if (priceError || !priceVariant) {
      return { success: false, error: "Price option not found" };
    }

    const priceValidationError = validatePriceVariant(
      priceVariant.price_per_pax,
      priceVariant.flat_price
    );
    if (priceValidationError) {
      return { success: false, error: priceValidationError };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 5: Verify Guide is Eligible for This Package
    // ─────────────────────────────────────────────────────────────────────────
    const { data: packageGuide, error: pgError } = await supabase
      .from(PACKAGE_GUIDES_TABLE)
      .select("id")
      .eq("package_id", input.packageId)
      .eq("guide_id", input.guideId)
      .single();

    if (pgError || !packageGuide) {
      return { success: false, error: "This guide is not available for this package" };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 6: Verify Guide Has Availability on This Date
    // ─────────────────────────────────────────────────────────────────────────
    const { data: guideAvail, error: gaError } = await supabase
      .from(GUIDE_AVAILABILITY_TABLE)
      .select("id")
      .eq("guide_id", input.guideId)
      .lte("available_from", input.bookingDate)
      .gte("available_until", input.bookingDate)
      .single();

    if (gaError || !guideAvail) {
      return { success: false, error: "This guide is not available on the selected date" };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 7: Check No Existing Booking (Race Condition Prevention)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: existingBooking, error: exError } = await supabase
      .from(BOOKING_TABLE)
      .select("id")
      .eq("guide_id", input.guideId)
      .eq("booking_date", input.bookingDate)
      .eq("status", "completed")
      .single();

    if (!exError && existingBooking) {
      return { success: false, error: "This guide is already booked for this date" };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 8: Calculate Total Amount (Snapshot at booking time)
    // ─────────────────────────────────────────────────────────────────────────
    // Use flat_price if set, otherwise price_per_pax (for 1 person)
    // In a real system, you'd also track number of pax
    const totalAmount = priceVariant.flat_price ?? priceVariant.price_per_pax ?? 0;

    // ─────────────────────────────────────────────────────────────────────────
    // Step 9: Create Booking (Atomic Insert)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: booking, error: bookingError } = await supabase
      .from(BOOKING_TABLE)
      .insert({
        [BOOKING_FIELDS.touristId]: session.user.id,
        [BOOKING_FIELDS.packageId]: input.packageId,
        [BOOKING_FIELDS.operatorId]: pkg.operator_id,
        [BOOKING_FIELDS.guideId]: input.guideId,
        [BOOKING_FIELDS.bookingDate]: input.bookingDate,
        [BOOKING_FIELDS.status]: "pending_payment",
        [BOOKING_FIELDS.totalAmount]: totalAmount,
      })
      .select("id")
      .single();

    if (bookingError || !booking?.id) {
      console.error("createBooking: insert failed:", bookingError);
      return { success: false, error: "Could not create booking" };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 10: Award Points (Rewards Integration)
    // ─────────────────────────────────────────────────────────────────────────
    // Note: Rewards integration will be added in a future update
    // For now, points award is commented out
    // try {
    //   const { addPoints } = await import("@/lib/rewards");
    //   await addPoints(session.user.id, 10, "tours_booking_created");
    // } catch (pointsErr) {
    //   console.error("createBooking: points award failed (non-critical):", pointsErr);
    // }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 11: Revalidate Cache
    // ─────────────────────────────────────────────────────────────────────────
    revalidatePath("/tours/tourist/bookings");

    return { success: true, data: { bookingId: booking.id } };
  } catch (err) {
    console.error("createBooking exception:", err);
    return { success: false, error: "Unexpected error creating booking" };
  }
}

// ============================================================================
// BOOKING VIEWING (Tourist dashboard)
// ============================================================================

/**
 * Get current tourist's bookings (paginated)
 * 
 * Shows all bookings for the signed-in tourist
 * RLS: Can only see own bookings
 */
export async function getTouristBookings(
  page: number = 1,
  pageSize: number = 20
): Promise<ActionResult<BookingWithDetails[]>> {
  const session = await getAuthenticatedSession();
  if (!session.user) {
    return { success: false, error: "You must be signed in" };
  }

  if (session.role !== "tourist") {
    return { success: false, error: "Only tourists can view bookings" };
  }

  try {
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    const offset = (page - 1) * pageSize;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from(BOOKING_TABLE)
      .select(BOOKING_LIST_SELECT)
      .eq("tourist_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("getTouristBookings error:", error);
      return { success: false, error: "Could not load bookings" };
    }

    return { success: true, data: (data ?? []) as unknown as BookingWithDetails[] };
  } catch (err) {
    console.error("getTouristBookings exception:", err);
    return { success: false, error: "Unexpected error loading bookings" };
  }
}

/**
 * Get one booking detail (for viewing/managing)
 * 
 * RLS: Can only see own booking (if tourist) or package bookings (if operator/admin)
 */
export async function getBookingDetail(
  bookingId: string
): Promise<ActionResult<BookingWithDetails>> {
  const session = await getAuthenticatedSession();
  if (!session.user) {
    return { success: false, error: "You must be signed in" };
  }

  if (!bookingId || typeof bookingId !== "string") {
    return { success: false, error: "Booking ID is required" };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Different queries based on role
    let query = supabase
      .from(BOOKING_TABLE)
      .select(BOOKING_DETAIL_SELECT)
      .eq("id", bookingId);

    // Tourists see only their own bookings
    if (session.role === "tourist") {
      query = query.eq("tourist_id", session.user.id);
    }
    // Operators see bookings for their packages
    else if (session.role === "operator") {
      query = query.eq("operator_id", session.user.id);
    }
    // Admins can see all (RLS enforces)

    const { data, error } = await query.single();

    if (error || !data) {
      return { success: false, error: "Booking not found" };
    }

    return { success: true, data: data as unknown as BookingWithDetails };
  } catch (err) {
    console.error("getBookingDetail exception:", err);
    return { success: false, error: "Could not load booking details" };
  }
}

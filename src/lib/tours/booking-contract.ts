import "server-only";

/**
 * Booking Engine Contract
 * 
 * Centralized data mapping between JavaScript (camelCase) and database (snake_case).
 * Database tables: tours_bookings, tours_package_availability, tours_guide_availability, tours_package_guides
 * 
 * Use this file as the source of truth for field names. If the schema changes, update here first.
 */

export const BOOKING_TABLE = "tours_bookings";
export const BOOKING_AVAILABILITY_TABLE = "tours_package_availability";
export const GUIDE_AVAILABILITY_TABLE = "tours_guide_availability";
export const PACKAGE_GUIDES_TABLE = "tours_package_guides";

/**
 * Field mapping: JavaScript → Database column names
 */
export const BOOKING_FIELDS = {
  id: "id",
  touristId: "tourist_id",
  packageId: "package_id",
  operatorId: "operator_id",
  guideId: "guide_id",
  bookingDate: "booking_date",
  status: "status",
  totalAmount: "total_amount",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

/**
 * Booking status enum
 */
export type BookingStatus = "pending_payment" | "completed" | "cancelled";

/**
 * Core booking record (minimal fields for listing)
 */
export interface BookingRecord {
  id: string;
  tourist_id: string;
  package_id: string;
  operator_id: string;
  guide_id: string;
  booking_date: string;
  status: BookingStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

/**
 * Booking with related data (for detail view, includes joins)
 */
export interface BookingWithDetails extends BookingRecord {
  packages?: {
    id: string;
    title: string;
    description: string | null;
    location_name: string;
    duration_value: number;
    duration_type: string;
  };
  tours_guides?: {
    id: string;
    profile_id: string;
    bio: string;
  };
  profiles?: {
    id: string;
    full_name: string | null;
  };
}

/**
 * Booking list query (what to select when listing bookings)
 * Includes joins to get package title, guide profile_id, and tourist full_name
 */
export const BOOKING_LIST_SELECT = `
  id,
  tourist_id,
  package_id,
  operator_id,
  guide_id,
  booking_date,
  status,
  total_amount,
  created_at,
  updated_at,
  packages(id, title),
  tours_guides(id, profile_id),
  profiles(id, full_name)
`;

/**
 * Booking detail query (what to select when viewing one booking)
 * More fields for detailed view
 */
export const BOOKING_DETAIL_SELECT = `
  id,
  tourist_id,
  package_id,
  operator_id,
  guide_id,
  booking_date,
  status,
  total_amount,
  created_at,
  updated_at,
  packages(id, title, description, location_name, duration_value, duration_type),
  tours_guides(id, profile_id, bio),
  profiles(id, full_name)
`;

/**
 * Package availability record
 */
export interface PackageAvailabilityRecord {
  id: string;
  package_id: string;
  available_from: string; // YYYY-MM-DD
  available_until: string; // YYYY-MM-DD
  created_at: string;
}

/**
 * Guide availability record
 */
export interface GuideAvailabilityRecord {
  id: string;
  guide_id: string;
  available_from: string; // YYYY-MM-DD
  available_until: string; // YYYY-MM-DD
  created_at: string;
}

/**
 * Package-guide eligibility record
 * (which guides can lead which packages)
 */
export interface PackageGuideRecord {
  id: string;
  package_id: string;
  guide_id: string;
  created_at: string;
}

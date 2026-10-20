/**
 * Shared types for package creation and editing.
 * These match the backend contract types but are used client-side.
 */

export interface PackageDraft {
  title: string;
  description: string | null;
  locationName: string;
  durationValue: number;
  durationType: "hours" | "days";
  inclusions: string[];
  exclusions: string[];
  coverImageUrl: string | null;
  galleryUrls: string[];
  priceVariants: PriceVariantDraft[];
  stops: StopDraft[];
}

export interface PriceVariantDraft {
  id?: string;
  variantName: string;
  minPax: number;
  maxPax: number | null;
  pricePerPax: number | null;
  flatPrice: number | null;
  isDefault: boolean;
}

export interface StopDraft {
  id?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  description: string | null;
  estimatedDurationMinutes: number | null;
}

export type PackageStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";

export interface PackageListItem {
  id: string;
  title: string;
  locationName: string;
  coverImageUrl: string | null;
  status: PackageStatus;
  createdAt: string;
  updatedAt: string;
}

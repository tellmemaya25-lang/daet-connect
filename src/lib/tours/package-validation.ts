export interface PriceVariantInput {
  id?: string;
  variantName: string;
  minPax: number;
  maxPax: number | null;
  pricePerPax: number | null;
  flatPrice: number | null;
  isDefault: boolean;
}

export interface PackageStopInput {
  id?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  description: string | null;
  estimatedDurationMinutes: number | null;
}

/** Mirrors price_variant_check exactly for the price fields: OR, not XOR. */
export function validatePriceVariant(variant: PriceVariantInput): string | null {
  if (!variant || typeof variant.variantName !== "string" || !variant.variantName.trim()) {
    return "Variant name is required.";
  }
  if (!Number.isFinite(variant.minPax) || !Number.isInteger(variant.minPax) || variant.minPax < 1) {
    return "Minimum pax must be at least 1.";
  }
  if (variant.maxPax !== null) {
    if (!Number.isFinite(variant.maxPax) || !Number.isInteger(variant.maxPax)) {
      return "Maximum pax must be a whole number.";
    }
    if (variant.maxPax < variant.minPax) {
      return "Maximum pax cannot be less than minimum pax.";
    }
  }
  if (
    (variant.pricePerPax !== null && !Number.isFinite(variant.pricePerPax)) ||
    (variant.flatPrice !== null && !Number.isFinite(variant.flatPrice))
  ) {
    return "Prices must be finite numbers.";
  }
  if (variant.pricePerPax === null && variant.flatPrice === null) {
    return "Either price per pax or flat price must be set.";
  }
  if (
    (variant.pricePerPax !== null && variant.pricePerPax < 0) ||
    (variant.flatPrice !== null && variant.flatPrice < 0)
  ) {
    return "Prices cannot be negative.";
  }
  return null;
}

export function validatePackageStop(stop: PackageStopInput): string | null {
  if (!stop || typeof stop.locationName !== "string" || !stop.locationName.trim()) {
    return "Stop location name is required.";
  }
  if (!Number.isFinite(stop.latitude) || stop.latitude < -90 || stop.latitude > 90) {
    return "Latitude must be between -90 and 90.";
  }
  if (!Number.isFinite(stop.longitude) || stop.longitude < -180 || stop.longitude > 180) {
    return "Longitude must be between -180 and 180.";
  }
  if (stop.description !== null && typeof stop.description !== "string") {
    return "Stop description must be text.";
  }
  if (
    stop.estimatedDurationMinutes !== null &&
    (!Number.isFinite(stop.estimatedDurationMinutes) ||
      !Number.isInteger(stop.estimatedDurationMinutes) ||
      stop.estimatedDurationMinutes < 0)
  ) {
    // estimated_duration_minutes is an integer column: Postgres would silently
    // round a fractional value on assignment, so reject it here instead.
    return "Estimated duration must be a whole number of minutes, 0 or more.";
  }
  return null;
}

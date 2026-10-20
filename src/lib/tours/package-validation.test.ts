import { validatePackageStop, validatePriceVariant } from "@/lib/tours/package-validation";

const baseVariant = {
  variantName: "Standard",
  minPax: 1,
  maxPax: null,
  pricePerPax: 125,
  flatPrice: null,
  isDefault: true,
};

const baseStop = {
  locationName: "Bagasbas Beach",
  latitude: 14.1086,
  longitude: 122.9398,
  description: null,
  estimatedDurationMinutes: 45,
};

describe("validatePriceVariant", () => {
  it("accepts a complete variant", () => {
    expect(validatePriceVariant(baseVariant)).toBeNull();
  });

  it("rejects a negative price per pax", () => {
    expect(validatePriceVariant({ ...baseVariant, pricePerPax: -1 })).toBe(
      "Prices cannot be negative.",
    );
  });

  it("rejects a negative flat price", () => {
    expect(
      validatePriceVariant({ ...baseVariant, pricePerPax: null, flatPrice: -0.01 }),
    ).toBe("Prices cannot be negative.");
  });

  it("accepts zero as a valid price", () => {
    expect(validatePriceVariant({ ...baseVariant, pricePerPax: 0 })).toBeNull();
  });

  it("requires at least one price", () => {
    expect(validatePriceVariant({ ...baseVariant, pricePerPax: null, flatPrice: null })).toBe(
      "Either price per pax or flat price must be set.",
    );
  });

  it("rejects non-finite prices", () => {
    expect(validatePriceVariant({ ...baseVariant, pricePerPax: Number.NaN })).toBe(
      "Prices must be finite numbers.",
    );
  });

  it("rejects a maximum below the minimum", () => {
    expect(validatePriceVariant({ ...baseVariant, minPax: 6, maxPax: 5 })).toBe(
      "Maximum pax cannot be less than minimum pax.",
    );
  });

  it("rejects fractional pax values", () => {
    expect(validatePriceVariant({ ...baseVariant, minPax: 1.5 })).toBe(
      "Minimum pax must be at least 1.",
    );
  });

  it("requires a variant name", () => {
    expect(validatePriceVariant({ ...baseVariant, variantName: "   " })).toBe(
      "Variant name is required.",
    );
  });
});

describe("validatePackageStop", () => {
  it("accepts a complete stop", () => {
    expect(validatePackageStop(baseStop)).toBeNull();
  });

  it("accepts a null estimated duration", () => {
    expect(validatePackageStop({ ...baseStop, estimatedDurationMinutes: null })).toBeNull();
  });

  it("rejects a fractional estimated duration because the column is an integer", () => {
    expect(validatePackageStop({ ...baseStop, estimatedDurationMinutes: 45.5 })).toBe(
      "Estimated duration must be a whole number of minutes, 0 or more.",
    );
  });

  it("rejects a negative estimated duration", () => {
    expect(validatePackageStop({ ...baseStop, estimatedDurationMinutes: -5 })).toBe(
      "Estimated duration must be a whole number of minutes, 0 or more.",
    );
  });

  it("accepts zero minutes", () => {
    expect(validatePackageStop({ ...baseStop, estimatedDurationMinutes: 0 })).toBeNull();
  });

  it("rejects out-of-range coordinates", () => {
    expect(validatePackageStop({ ...baseStop, latitude: 91 })).toBe(
      "Latitude must be between -90 and 90.",
    );
    expect(validatePackageStop({ ...baseStop, longitude: -181 })).toBe(
      "Longitude must be between -180 and 180.",
    );
  });

  it("requires a location name", () => {
    expect(validatePackageStop({ ...baseStop, locationName: "" })).toBe(
      "Stop location name is required.",
    );
  });
});

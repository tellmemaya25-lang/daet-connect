import { canAccessGuideDashboard, canAccessGuideQr } from "@/lib/tours/guide-access";

describe("guide approval access", () => {
  it("unlocks the dashboard and badge QR only for an approved guide", () => {
    expect(canAccessGuideDashboard("guide", "approved")).toBe(true);
    expect(canAccessGuideQr("guide", "approved")).toBe(true);
  });

  it.each([
    ["tourist", "approved"],
    ["guide", "pending"],
    ["guide", "rejected"],
    ["admin", "approved"],
    [null, "approved"],
  ])("denies dashboard and QR access for role=%s status=%s", (role, status) => {
    expect(canAccessGuideDashboard(role, status)).toBe(false);
    expect(canAccessGuideQr(role, status)).toBe(false);
  });
});

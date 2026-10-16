import { canAccessOperatorDashboard } from "@/lib/tours/operator-access";

describe("canAccessOperatorDashboard", () => {
  it("allows only an approved operator", () => {
    expect(canAccessOperatorDashboard("operator", "approved")).toBe(true);
  });

  it.each([
    ["operator", "pending"],
    ["operator", "rejected"],
    ["tourist", "approved"],
    ["admin", "approved"],
    [null, "approved"],
  ] as const)("blocks role=%s with status=%s", (role, status) => {
    expect(canAccessOperatorDashboard(role, status)).toBe(false);
  });
});

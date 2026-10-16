import type { GuideAccreditationStatus } from "@/lib/tours/guide-contract";

export function canAccessGuideDashboard(
  role: string | null | undefined,
  status: GuideAccreditationStatus | string | null | undefined,
): boolean {
  return role === "guide" && status === "approved";
}

export function canAccessGuideQr(
  role: string | null | undefined,
  status: GuideAccreditationStatus | string | null | undefined,
): boolean {
  return canAccessGuideDashboard(role, status);
}

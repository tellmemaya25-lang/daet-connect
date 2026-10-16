import type { AccreditationStatus } from "@/lib/tours/operator-contract";

/** Shared server-side predicate used by the operator dashboard and its tests. */
export function canAccessOperatorDashboard(
  role: string | null | undefined,
  status: AccreditationStatus | string | null | undefined,
): boolean {
  return role === "operator" && status === "approved";
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

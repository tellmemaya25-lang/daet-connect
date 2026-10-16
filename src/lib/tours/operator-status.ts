import "server-only";
import {
  OPERATOR_OWN_STATUS_SELECT,
  OPERATOR_TABLE,
  OPERATOR_USER_ID_COLUMN,
  type OperatorOwnStatusRecord,
} from "@/lib/tours/operator-contract";
import { isUuid } from "@/lib/tours/operator-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type OwnOperatorStatusResult =
  | { ok: true; application: OperatorOwnStatusRecord | null }
  | { ok: false };

/**
 * Reads only the signed-in user's public accreditation status. Call this only
 * after verifying the Supabase session; the service-role query is narrowly
 * filtered by that server-derived user ID and never selects document paths.
 */
export async function getOwnOperatorApplicationStatus(
  authenticatedUserId: string,
): Promise<OwnOperatorStatusResult> {
  if (!isUuid(authenticatedUserId)) return { ok: false };

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from(OPERATOR_TABLE)
      .select(OPERATOR_OWN_STATUS_SELECT)
      .eq(OPERATOR_USER_ID_COLUMN, authenticatedUserId)
      .maybeSingle();

    if (error) {
      console.error("Could not load an operator's own application status.", {
        code: error.code,
      });
      return { ok: false };
    }

    return {
      ok: true,
      application: data as OperatorOwnStatusRecord | null,
    };
  } catch {
    console.error("Could not initialize or complete an operator status lookup.");
    return { ok: false };
  }
}

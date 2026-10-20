/**
 * Adapter for the verified tours schema. Keep table/column names in one place;
 * this project starts without generated Supabase Database types, so see the
 * schema mapping note in README before changing the application payload.
 *
 * The *_url columns intentionally store private Storage object paths, not
 * public URLs or expiring signed URLs.
 */
export const OPERATOR_TABLE = "tours_operators";
export const PROFILE_TABLE = "profiles";
export const PROFILE_ID_COLUMN = "id";
export const PROFILE_ROLE_COLUMN = "role";
export const OPERATOR_USER_ID_COLUMN = "profile_id";
export const OPERATOR_STATUS_COLUMN = "accreditation_status";
export const OPERATOR_NOTES_COLUMN = "accreditation_notes";

export const OPERATOR_DOCUMENT_BUCKET =
  process.env.TOURS_OPERATOR_DOCUMENTS_BUCKET ?? "tours-operator-documents";

/**
 * Columns that must never be readable by `anon` or `authenticated`.
 *
 * Row-level security decides which ROWS a role sees; it cannot hide COLUMNS of
 * a visible row. The "Public can view approved operators" policy would expose
 * these on every approved operator, so column-level REVOKE/GRANT enforces the
 * boundary instead — see
 * supabase/migrations/20261017130000_operator_document_privacy.sql.
 *
 * These are readable server-side with service_role only, which bypasses both
 * RLS and column grants.
 */
export const OPERATOR_RESTRICTED_COLUMNS = [
  "contact_person",
  "contact_email",
  "contact_phone",
  "dti_registration_url",
  "business_permit_url",
  "gcash_qr_url",
  "accreditation_notes",
  "reviewed_by",
  "reviewed_at",
] as const;

/**
 * Columns granted to `anon`. Public catalogue fields only.
 *
 * `profile_id` is intentionally absent for anon but granted to `authenticated`,
 * because the tours_packages RLS policies match ownership through
 * `tours_operators.profile_id = auth.uid()`. Policy expressions run with the
 * invoking user's privileges, so revoking it there would break every package
 * query.
 */
export const OPERATOR_PUBLIC_COLUMNS = [
  "id",
  "business_name",
  "business_description",
  "business_address",
  "accreditation_status",
  "created_at",
  "updated_at",
] as const;

/**
 * The only tours_operators columns a session client may select.
 *
 * Column privileges for `authenticated` are exactly
 * OPERATOR_PUBLIC_COLUMNS plus `profile_id`, so any session-client query must
 * stay within this set or Postgres rejects it.
 */
export const OPERATOR_SESSION_SAFE_COLUMNS = [
  ...OPERATOR_PUBLIC_COLUMNS,
  "profile_id",
] as const;

/**
 * SERVICE-ROLE ONLY. Selects restricted columns, so it must never be used with
 * a session client: `anon`/`authenticated` have no column grant for them.
 */
export const OPERATOR_APPLICATION_SELECT =
  "id,profile_id,business_name,contact_person,contact_email,contact_phone,business_address,dti_registration_url,business_permit_url,gcash_qr_url,accreditation_status,accreditation_notes,reviewed_by,reviewed_at,created_at";

/** SERVICE-ROLE ONLY. Includes accreditation_notes, a restricted column. */
export const OPERATOR_OWN_STATUS_SELECT =
  "id,accreditation_status,accreditation_notes,created_at";

export const OPERATOR_FILE_COLUMNS = {
  dtiDocument: "dti_registration_url",
  businessPermit: "business_permit_url",
  gcashQr: "gcash_qr_url",
} as const;

export type AccreditationStatus = "pending" | "approved" | "rejected";

export interface OperatorApplicationRecord {
  id: string;
  profile_id: string;
  business_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  /** Nullable in the live schema, so it must not be typed as always present. */
  business_address: string | null;
  dti_registration_url: string | null;
  business_permit_url: string | null;
  gcash_qr_url: string | null;
  accreditation_status: AccreditationStatus;
  accreditation_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface OperatorOwnStatusRecord {
  id: string;
  accreditation_status: AccreditationStatus;
  accreditation_notes: string | null;
  created_at: string;
}

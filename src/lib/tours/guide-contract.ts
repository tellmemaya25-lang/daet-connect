import "server-only";

/**
 * Column contract for guide registration. The repo does not contain generated
 * Supabase types or the source DDL, so verify these names against the locked
 * Supabase schema before production use. Sensitive table constants are imported
 * only by Server Actions; never import this module at runtime in a Client Component.
 */
export const GUIDE_TABLE = "tours_guides";
export const GUIDE_SENSITIVE_TABLE = "tours_guide_sensitive_info";
export const GUIDE_USER_ID_COLUMN = "user_id";
export const GUIDE_STATUS_COLUMN = "accreditation_status";

export const GUIDE_SENSITIVE_DOCUMENT_BUCKET =
  process.env.TOURS_GUIDE_SENSITIVE_BUCKET ?? "tours-guide-sensitive-documents";

export const GUIDE_OWN_STATUS_SELECT =
  "id,full_name,accreditation_status,rejection_reason,created_at";

export const GUIDE_ADMIN_SELECT =
  "id,full_name,contact_phone,bio,accreditation_status,rejection_reason,created_at";

export const GUIDE_PUBLIC_FIELDS = {
  fullName: "full_name",
  contactPhone: "contact_phone",
  bio: "bio",
} as const;

export const GUIDE_SENSITIVE_FIELDS = {
  guideId: "guide_id",
  idType: "id_type",
  idNumber: "id_number",
  documentPath: "id_document_path",
  consent: "consent_full_id_display",
  consentAt: "consent_given_at",
} as const;

export type GuideAccreditationStatus = "pending" | "approved" | "rejected";

export interface GuideOwnStatusRecord {
  id: string;
  full_name: string;
  accreditation_status: GuideAccreditationStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface GuideAdminRecord extends GuideOwnStatusRecord {
  contact_phone: string;
  bio: string;
}

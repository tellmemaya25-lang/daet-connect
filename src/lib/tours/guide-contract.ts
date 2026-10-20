import "server-only";

/**
 * Guide registration column contract. The guide identity table is server-only;
 * the repository has no generated Supabase Database types or source DDL, so keep
 * every expected field name centralized here and verify it against the locked
 * schema before deployment.
 */

export const GUIDE_TABLE = "tours_guides";
export const GUIDE_SENSITIVE_TABLE = "tours_guide_sensitive_info";
export const GUIDE_USER_ID_COLUMN = "profile_id";
export const GUIDE_STATUS_COLUMN = "accreditation_status";
export const GUIDE_NOTES_COLUMN = "accreditation_notes";

export const GUIDE_SENSITIVE_DOCUMENT_BUCKET =
  process.env.TOURS_GUIDE_SENSITIVE_BUCKET ?? "tours-guide-sensitive-documents";

export const GUIDE_OWN_STATUS_SELECT =
  `id,${GUIDE_STATUS_COLUMN},${GUIDE_NOTES_COLUMN},created_at`;

export const GUIDE_ADMIN_SELECT =
  `id,${GUIDE_USER_ID_COLUMN},contact_phone,bio,${GUIDE_STATUS_COLUMN},${GUIDE_NOTES_COLUMN},created_at`;

// Written to tours_guides. fullName intentionally excluded — goes to profiles instead.
export const GUIDE_PUBLIC_FIELDS = {
  contactPhone: "contact_phone",
  bio: "bio",
  consent: "consent_full_id_display",
  consentAt: "consent_given_at",
} as const;

// Written to tours_guide_sensitive_info (service_role only).
// fullLegalName added — previously missing entirely, so verified legal 
// names were never actually being saved anywhere.
export const GUIDE_SENSITIVE_FIELDS = {
  guideId: "guide_id",
  fullLegalName: "full_legal_name",
  idType: "id_type",
  idNumber: "id_number",
  documentPath: "id_document_path",
} as const;

export type GuideAccreditationStatus = "pending" | "approved" | "rejected";

export interface GuideOwnStatusRecord {
  id: string;
  accreditation_status: GuideAccreditationStatus;
  accreditation_notes: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

export interface GuideAdminRecord {
  id: string;
  profile_id: string;
  contact_phone: string;
  bio: string;
  accreditation_status: GuideAccreditationStatus;
  accreditation_notes: string | null;
  created_at: string;
<<<<<<< HEAD
}
=======
  profiles: { full_name: string | null } | null;
}
>>>>>>> main

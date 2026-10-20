import {
  OPERATOR_APPLICATION_SELECT,
  OPERATOR_OWN_STATUS_SELECT,
  OPERATOR_PUBLIC_COLUMNS,
  OPERATOR_RESTRICTED_COLUMNS,
  OPERATOR_SESSION_SAFE_COLUMNS,
} from "@/lib/tours/operator-contract";

/**
 * Guards the column-level privacy boundary for tours_operators.
 *
 * Row-level security cannot hide columns of a visible row, so the restricted
 * columns are enforced by REVOKE/GRANT in
 * supabase/migrations/20261017130000_operator_document_privacy.sql. These tests
 * keep the TypeScript contract aligned with that migration: if a select string
 * ever starts naming a restricted column for a session client, Postgres would
 * reject the query at runtime, so the mistake must be caught here instead.
 */
function columnsOf(select: string): string[] {
  return select
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);
}

describe("operator column privacy boundary", () => {
  it("lists the document and contact columns as restricted", () => {
    expect(OPERATOR_RESTRICTED_COLUMNS).toEqual(
      expect.arrayContaining([
        "contact_person",
        "contact_email",
        "contact_phone",
        "dti_registration_url",
        "business_permit_url",
        "gcash_qr_url",
      ]),
    );
  });

  it("keeps the public column set free of every restricted column", () => {
    const overlap = OPERATOR_PUBLIC_COLUMNS.filter((column) =>
      (OPERATOR_RESTRICTED_COLUMNS as readonly string[]).includes(column),
    );
    expect(overlap).toEqual([]);
  });

  it("keeps the session-safe column set free of every restricted column", () => {
    const overlap = OPERATOR_SESSION_SAFE_COLUMNS.filter((column) =>
      (OPERATOR_RESTRICTED_COLUMNS as readonly string[]).includes(column),
    );
    expect(overlap).toEqual([]);
  });

  it("grants profile_id to session clients so package RLS subqueries still work", () => {
    // The tours_packages policies filter on tours_operators.profile_id, and
    // policy expressions run with the invoking user's privileges.
    expect(OPERATOR_SESSION_SAFE_COLUMNS).toContain("profile_id");
    expect(OPERATOR_PUBLIC_COLUMNS).not.toContain("profile_id");
  });

  it("exposes only id and accreditation_status to the package actions", () => {
    // requireApprovedOperator() is the only session-client read of the table.
    const sessionRead = columnsOf("id,accreditation_status");
    const disallowed = sessionRead.filter(
      (column) => !(OPERATOR_SESSION_SAFE_COLUMNS as readonly string[]).includes(column),
    );
    expect(disallowed).toEqual([]);
  });

  it("marks the service-role selects as containing restricted columns", () => {
    // Both are deliberately service-role only; this asserts the doc comments
    // stay truthful if someone narrows or widens the select strings.
    const applicationColumns = columnsOf(OPERATOR_APPLICATION_SELECT);
    expect(applicationColumns).toEqual(
      expect.arrayContaining(["dti_registration_url", "gcash_qr_url", "contact_email"]),
    );

    const ownStatusColumns = columnsOf(OPERATOR_OWN_STATUS_SELECT);
    expect(ownStatusColumns).toContain("accreditation_notes");
  });

  it("never lets the own-status select name a document or contact column", () => {
    const ownStatusColumns = columnsOf(OPERATOR_OWN_STATUS_SELECT);
    for (const column of [
      "dti_registration_url",
      "business_permit_url",
      "gcash_qr_url",
      "contact_email",
      "contact_phone",
      "contact_person",
    ]) {
      expect(ownStatusColumns).not.toContain(column);
    }
  });
});

import "server-only";

export type GuideSensitiveAuditOperation =
  | "read_existing_document_path"
  | "write_sensitive_info"
  | "read_document_path_for_review"
  | "create_private_document_link";

export type GuideSensitiveAuditOutcome = "success" | "failure" | "not_found";

/**
 * Emit a minimal audit record to the server runtime logs for private guide-data
 * access. Do not pass names, ID numbers, document paths, URLs, or file contents.
 * This deliberately avoids assuming a database audit table in the locked schema.
 */
export function auditGuideSensitiveAccess(input: {
  actorUserId: string;
  guideId: string;
  operation: GuideSensitiveAuditOperation;
  outcome: GuideSensitiveAuditOutcome;
}): void {
  const record = {
    event: "guide_sensitive_access",
    at: new Date().toISOString(),
    actor_user_id: input.actorUserId,
    guide_id: input.guideId,
    operation: input.operation,
    outcome: input.outcome,
  };
  try {
    console.info("[guide-sensitive-audit]", JSON.stringify(record));
  } catch {
    // Audit logging must not expose private values or break the protected action.
    // Hosting platforms should retain server logs according to the project's policy.
  }
}

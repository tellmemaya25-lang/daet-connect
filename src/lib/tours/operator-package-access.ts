import "server-only";

import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { getOwnOperatorApplicationStatus } from "@/lib/tours/operator-status";
import { canAccessOperatorDashboard } from "@/lib/tours/operator-access";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Page-level gate for the operator package screens.
 *
 * This is a routing/UX convenience only. Every package Server Action
 * independently re-verifies the session, the operator role, the approved
 * accreditation status, package ownership, and draft status, and the database
 * policies enforce the same boundary. Never treat a result from this module as
 * authorization on its own.
 */
export type OperatorPackageAccess =
  | { kind: "ready" }
  | { kind: "blocked"; title: string; body: string };

/**
 * Resolves whether the signed-in operator may see the package screens.
 *
 * Calls `redirect()` for the cases that belong on another page (not signed in,
 * admin, application not yet submitted, pending, or rejected) so each package
 * page stays short, and returns a `blocked` notice for states that should be
 * explained in place rather than redirected.
 */
export async function resolveOperatorPackageAccess(nextPath: string): Promise<OperatorPackageAccess> {
  if (!isSupabaseConfigured()) {
    return {
      kind: "blocked",
      title: "Supabase setup is needed",
      body: "Configure Supabase before managing tour packages.",
    };
  }

  let session;
  try {
    session = await getAuthenticatedSession();
  } catch {
    session = { user: null, role: null, error: "Supabase could not be reached." };
  }

  if (!session.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (session.role === "admin") {
    redirect("/tours/admin/operators");
  }
  if (session.error || session.role !== "operator") {
    return {
      kind: "blocked",
      title: "We could not verify your account",
      body: session.error ?? "Only an accredited tour operator can manage packages.",
    };
  }

  // Reads the caller's own accreditation status through a narrowly scoped
  // service-role query; see getOwnOperatorApplicationStatus().
  const statusResult = await getOwnOperatorApplicationStatus(session.user.id);
  if (!statusResult.ok) {
    return {
      kind: "blocked",
      title: "Accreditation could not be checked",
      body: "Package management is paused until your accreditation status can be verified. Please try again.",
    };
  }

  const application = statusResult.application;
  if (!application || application.accreditation_status === "rejected") {
    redirect("/tours/operator/register");
  }
  if (application.accreditation_status !== "approved") {
    redirect("/tours/operator/pending");
  }
  if (!canAccessOperatorDashboard(session.role, application.accreditation_status)) {
    return {
      kind: "blocked",
      title: "Operator access is not enabled",
      body: "Your accreditation is approved, but the account role does not match. Contact the Tourism Office administrator.",
    };
  }

  return { kind: "ready" };
}

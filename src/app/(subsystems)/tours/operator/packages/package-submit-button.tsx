"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitPackageForReview } from "@/app/(subsystems)/tours/operator/packages/actions";
import { Notice } from "@/components/ui/notice";

/**
 * Submit-for-review control for a draft package.
 *
 * The Server Action re-verifies ownership, draft status, and completeness of
 * pricing and stops, so a successful client-side render here is never the
 * authorization decision.
 */
export function PackageSubmitButton({
  packageId,
  disabled = false,
}: {
  packageId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (isPending || disabled || submitted) return;
    setError("");

    startTransition(async () => {
      const result = await submitPackageForReview(packageId);
      if (!result.success) {
        setError(result.error ?? "Could not submit this package. Please try again.");
        return;
      }
      setSubmitted(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-daet-ink/10 bg-white p-5 shadow-card sm:p-8">
      <h2 className="text-xl font-black text-daet-ink">Submit for review</h2>
      <p className="mt-1 text-sm leading-6 text-daet-ink/65">
        The Daet Tourism Office reviews every package before it appears in the public catalogue. You
        can keep editing while the package is a draft.
      </p>

      {error ? (
        <Notice variant="error" title="We couldn’t submit this package" className="mt-5">
          {error}
        </Notice>
      ) : null}
      {submitted ? (
        <Notice variant="success" title="Submitted for review" className="mt-5">
          Your package is now pending review. We’ll notify you once the Tourism Office has decided.
        </Notice>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-daet-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/tours/operator/packages"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-daet-ink/15 px-6 text-sm font-bold text-daet-ink transition hover:bg-daet-sand"
        >
          Back to packages
        </a>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isPending || submitted}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Submitting…" : submitted ? "Pending review" : "Submit for review"}
          {!isPending && !submitted ? <span aria-hidden="true">↗</span> : null}
        </button>
      </div>
    </section>
  );
}

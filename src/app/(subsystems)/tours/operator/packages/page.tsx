import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { PageFrame } from "@/components/ui/page-frame";
import { resolveOperatorPackageAccess } from "@/lib/tours/operator-package-access";
import { listOperatorPackages } from "@/app/(subsystems)/tours/operator/packages/actions";
import { PackageStatusBadge } from "@/app/(subsystems)/tours/operator/packages/package-status-badge";

export const dynamic = "force-dynamic";

const PACKAGES_PATH = "/tours/operator/packages";

function formatDuration(value: number, type: string): string {
  const unit = type === "days" ? (value === 1 ? "day" : "days") : value === 1 ? "hour" : "hours";
  return `${value} ${unit}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function OperatorPackagesPage() {
  const access = await resolveOperatorPackageAccess(PACKAGES_PATH);
  if (access.kind === "blocked") {
    return (
      <PageFrame>
        <div className="mx-auto max-w-3xl">
          <Notice variant="error" title={access.title}>
            {access.body}
          </Notice>
        </div>
      </PageFrame>
    );
  }

  const result = await listOperatorPackages();

  if (!result.success) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-3xl">
          <Notice variant="error" title="Packages could not be loaded">
            {result.error ?? "Please try again."}
          </Notice>
          <Link
            href="/tours/operator/dashboard"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-daet-ink/15 px-6 text-sm font-bold text-daet-ink transition hover:bg-daet-sand"
          >
            Back to dashboard
          </Link>
        </div>
      </PageFrame>
    );
  }

  const packages = result.data ?? [];

  return (
    <PageFrame>
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">
              Operator tools
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-daet-ink sm:text-4xl">
              Your tour packages
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-daet-ink/70">
              Build a draft, add pricing and map stops, then submit it for Tourism Office review.
              Only published packages appear in the public catalogue.
            </p>
          </div>
          <Link
            href="/tours/operator/packages/new"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
          >
            New package <span aria-hidden="true">+</span>
          </Link>
        </div>

        {packages.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-daet-forest/25 bg-white p-8 text-center shadow-sm sm:p-12">
            <h2 className="text-xl font-black text-daet-ink">No packages yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-daet-ink/65">
              Create your first draft package. You can save it as often as you like before
              submitting it for review.
            </p>
            <Link
              href="/tours/operator/packages/new"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            >
              Create a package
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4">
            {packages.map((pkg) => (
              <li key={pkg.id}>
                <Link
                  href={`/tours/operator/packages/${pkg.id}`}
                  className="flex min-h-12 flex-col gap-3 rounded-2xl border border-daet-ink/10 bg-white p-5 shadow-sm transition hover:border-daet-forest/40 hover:shadow-card sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-daet-ink">{pkg.title}</p>
                    <p className="mt-1 truncate text-sm text-daet-ink/60">
                      {pkg.location_name} · {formatDuration(pkg.duration_value, pkg.duration_type)} ·
                      updated {formatDate(pkg.updated_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <PackageStatusBadge status={pkg.status} />
                    <span aria-hidden="true" className="text-daet-ink/40">
                      →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/tours/operator/dashboard"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-daet-ink/15 px-6 text-sm font-bold text-daet-ink transition hover:bg-daet-sand"
        >
          Back to dashboard
        </Link>
      </div>
    </PageFrame>
  );
}

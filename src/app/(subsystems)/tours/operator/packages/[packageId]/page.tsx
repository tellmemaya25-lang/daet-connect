import Link from "next/link";
import { Notice } from "@/components/ui/notice";
import { PageFrame } from "@/components/ui/page-frame";
import { resolveOperatorPackageAccess } from "@/lib/tours/operator-package-access";
import { getPackageDetail } from "@/app/(subsystems)/tours/operator/packages/actions";
import { PackageCoreForm } from "@/app/(subsystems)/tours/operator/packages/package-core-form";
import { PackageVariantsForm } from "@/app/(subsystems)/tours/operator/packages/package-variants-form";
import { PackageStopsForm } from "@/app/(subsystems)/tours/operator/packages/package-stops-form";
import {
  PackageStatusBadge,
  packageStatusLabel,
} from "@/app/(subsystems)/tours/operator/packages/package-status-badge";
import { PackageSubmitButton } from "@/app/(subsystems)/tours/operator/packages/package-submit-button";
import type { PackageStopInput, PriceVariantInput } from "@/lib/tours/package-contract";

export const dynamic = "force-dynamic";

function toLines(values: string[] | null): string {
  return (values ?? []).join("\n");
}

export default async function OperatorPackageDetailPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const access = await resolveOperatorPackageAccess(`/tours/operator/packages/${packageId}`);
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

  const result = await getPackageDetail(packageId);
  if (!result.success || !result.data) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-3xl">
          <Notice variant="error" title="This package could not be opened">
            {result.error ?? "Package not found or you do not have access."}
          </Notice>
          <Link
            href="/tours/operator/packages"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-daet-ink/15 px-6 text-sm font-bold text-daet-ink transition hover:bg-daet-sand"
          >
            Back to packages
          </Link>
        </div>
      </PageFrame>
    );
  }

  const pkg = result.data;
  // Only drafts are editable; the Server Actions and database policies enforce
  // the same rule, so this is presentation only.
  const isDraft = pkg.status === "draft";

  const variants: PriceVariantInput[] = (pkg.tours_package_price_variants ?? []).map((variant) => ({
    variantName: variant.variant_name,
    minPax: variant.min_pax,
    maxPax: variant.max_pax,
    pricePerPax: variant.price_per_pax,
    flatPrice: variant.flat_price,
    isDefault: variant.is_default,
  }));

  const stops: PackageStopInput[] = (pkg.tours_package_stops ?? []).map((stop) => ({
    locationName: stop.location_name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    description: stop.description,
    estimatedDurationMinutes: stop.estimated_duration_minutes,
  }));

  return (
    <PageFrame>
      <div className="mx-auto grid max-w-3xl gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">
              Operator tools
            </p>
            <h1 className="mt-2 break-words text-3xl font-black leading-tight tracking-tight text-daet-ink sm:text-4xl">
              {pkg.title}
            </h1>
            <p className="mt-2 text-sm text-daet-ink/60">
              {pkg.location_name} · {pkg.status === "draft" ? "Editing enabled" : "Read-only"}
            </p>
          </div>
          <PackageStatusBadge status={pkg.status} />
        </div>

        {!isDraft ? (
          <Notice variant="info" title={`This package is ${packageStatusLabel(pkg.status).toLowerCase()}`}>
            Only draft packages can be edited. Contact the Tourism Office if these details need to
            change.
          </Notice>
        ) : null}

        <PackageCoreForm
          packageId={pkg.id}
          disabled={!isDraft}
          initialValues={{
            title: pkg.title,
            description: pkg.description ?? "",
            locationName: pkg.location_name,
            durationValue: String(pkg.duration_value ?? ""),
            durationType: pkg.duration_type === "days" ? "days" : "hours",
            inclusions: toLines(pkg.inclusions),
            exclusions: toLines(pkg.exclusions),
            coverImageUrl: pkg.cover_image_url ?? "",
            galleryUrls: toLines(pkg.gallery_urls),
          }}
        />

        <PackageVariantsForm packageId={pkg.id} initialVariants={variants} disabled={!isDraft} />
        <PackageStopsForm packageId={pkg.id} initialStops={stops} disabled={!isDraft} />

        {isDraft ? <PackageSubmitButton packageId={pkg.id} /> : null}
      </div>
    </PageFrame>
  );
}

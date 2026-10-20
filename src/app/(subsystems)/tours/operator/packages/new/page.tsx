import { Notice } from "@/components/ui/notice";
import { PageFrame } from "@/components/ui/page-frame";
import { resolveOperatorPackageAccess } from "@/lib/tours/operator-package-access";
import { PackageCoreForm } from "@/app/(subsystems)/tours/operator/packages/package-core-form";

export const dynamic = "force-dynamic";

const PACKAGES_PATH = "/tours/operator/packages";

const INITIAL_VALUES = {
  title: "",
  description: "",
  locationName: "",
  durationValue: "",
  durationType: "hours" as const,
  inclusions: "",
  exclusions: "",
  coverImageUrl: "",
  galleryUrls: "",
};

export default async function NewOperatorPackagePage() {
  const access = await resolveOperatorPackageAccess(`${PACKAGES_PATH}/new`);
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

  return (
    <PageFrame>
      <div className="mx-auto max-w-3xl">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">
            Operator tools
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-daet-ink sm:text-4xl">
            Create a new package
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-daet-ink/70">
            This saves a draft. Add pricing and map stops next, then submit the package for Tourism
            Office review when it is ready.
          </p>
        </div>

        <PackageCoreForm initialValues={INITIAL_VALUES} />
      </div>
    </PageFrame>
  );
}

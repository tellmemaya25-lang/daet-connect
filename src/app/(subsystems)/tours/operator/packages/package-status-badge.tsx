import type { PackageStatus } from "@/lib/tours/package-contract";

const STATUS_STYLES: Record<PackageStatus, string> = {
  draft: "border-daet-ink/15 bg-daet-sand text-daet-ink/75",
  pending_review: "border-amber-200 bg-amber-50 text-amber-900",
  published: "border-emerald-200 bg-emerald-50 text-emerald-900",
  archived: "border-rose-200 bg-rose-50 text-rose-900",
};

const STATUS_LABELS: Record<PackageStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  archived: "Archived",
};

const KNOWN_STATUSES: PackageStatus[] = ["draft", "pending_review", "published", "archived"];

function resolveStatus(value: string): PackageStatus {
  return KNOWN_STATUSES.includes(value as PackageStatus) ? (value as PackageStatus) : "draft";
}

export function packageStatusLabel(value: string): string {
  return STATUS_LABELS[resolveStatus(value)];
}

/** Read-only status pill. Renders server-side; no client interactivity. */
export function PackageStatusBadge({ status }: { status: string }) {
  const resolved = resolveStatus(status);
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-bold ${STATUS_STYLES[resolved]}`}
    >
      {STATUS_LABELS[resolved]}
    </span>
  );
}

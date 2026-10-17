"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPackage,
  updatePackageCore,
  type PackageCoreInput,
} from "@/app/(subsystems)/tours/operator/packages/actions";
import { Notice } from "@/components/ui/notice";

/**
 * Form state is kept as strings so an empty optional numeric field stays empty
 * rather than collapsing to 0. Parsing and validation happen on submit, and the
 * Server Action re-validates everything independently.
 */
export interface PackageCoreFormValues {
  title: string;
  description: string;
  locationName: string;
  durationValue: string;
  durationType: "hours" | "days";
  inclusions: string;
  exclusions: string;
  coverImageUrl: string;
  galleryUrls: string;
}

const INPUT_CLASS =
  "mt-2 min-h-12 w-full rounded-2xl border border-daet-ink/15 bg-white px-4 text-base outline-none transition placeholder:text-daet-ink/35 focus:border-daet-forest focus:ring-4 focus:ring-daet-forest/10";
const TEXTAREA_CLASS =
  "mt-2 w-full rounded-2xl border border-daet-ink/15 bg-white px-4 py-3 text-base outline-none transition placeholder:text-daet-ink/35 focus:border-daet-forest focus:ring-4 focus:ring-daet-forest/10";

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function PackageCoreForm({
  packageId,
  initialValues,
  disabled = false,
}: {
  /** Omitted when creating a new package. */
  packageId?: string;
  initialValues: PackageCoreFormValues;
  /** True when the package is no longer a draft and must not be edited. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<PackageCoreFormValues>(initialValues);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof PackageCoreFormValues>(field: K, value: PackageCoreFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
    setSaved(false);
  }

  function buildInput(): PackageCoreInput | { error: string } {
    const durationValue = Number(values.durationValue);
    if (!values.title.trim()) return { error: "Title is required." };
    if (!values.locationName.trim()) return { error: "Location is required." };
    if (!Number.isInteger(durationValue) || durationValue <= 0) {
      return { error: "Duration must be a whole number greater than zero." };
    }
    return {
      title: values.title.trim(),
      description: values.description.trim() || null,
      locationName: values.locationName.trim(),
      durationValue,
      durationType: values.durationType,
      inclusions: toLines(values.inclusions),
      exclusions: toLines(values.exclusions),
      coverImageUrl: values.coverImageUrl.trim() || null,
      galleryUrls: toLines(values.galleryUrls),
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || disabled) return;
    setError("");
    setSaved(false);

    const input = buildInput();
    if ("error" in input) {
      setError(input.error);
      return;
    }

    startTransition(async () => {
      const result = packageId
        ? await updatePackageCore(packageId, input)
        : await createPackage(input);

      if (!result.success) {
        setError(result.error ?? "Could not save the package. Please try again.");
        return;
      }
      if (!packageId && result.data?.packageId) {
        // Continue into the full editor so pricing and stops can be added.
        router.replace(`/tours/operator/packages/${result.data.packageId}`);
        router.refresh();
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-daet-ink/10 bg-white p-5 shadow-card sm:p-8"
    >
      <h2 className="text-xl font-black text-daet-ink">Package details</h2>
      <p className="mt-1 text-sm leading-6 text-daet-ink/65">
        {packageId
          ? "Update the summary travellers see first. Pricing and map stops are saved separately below."
          : "Start with the summary travellers see first. You can add pricing and map stops after saving."}
      </p>

      {error ? (
        <Notice variant="error" title="We couldn’t save these details" className="mt-5">
          {error}
        </Notice>
      ) : null}
      {saved ? (
        <Notice variant="success" title="Package details saved" className="mt-5">
          Your changes are saved. The package stays a draft until you submit it for review.
        </Notice>
      ) : null}
      {disabled ? (
        <Notice variant="warning" title="Editing is locked" className="mt-5">
          Only draft packages can be edited. This package has already left draft status.
        </Notice>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-daet-ink">
            Package title <span className="text-rose-600">*</span>
          </span>
          <input
            name="title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            required
            maxLength={160}
            disabled={disabled || isPending}
            placeholder="e.g. Bagasbas Surf & Island Day Tour"
            className={INPUT_CLASS}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-daet-ink">
            Location <span className="text-rose-600">*</span>
          </span>
          <input
            name="locationName"
            value={values.locationName}
            onChange={(event) => update("locationName", event.target.value)}
            required
            maxLength={160}
            disabled={disabled || isPending}
            placeholder="e.g. Bagasbas Beach, Daet"
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-daet-ink">
            Duration <span className="text-rose-600">*</span>
          </span>
          <input
            name="durationValue"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={values.durationValue}
            onChange={(event) => update("durationValue", event.target.value)}
            required
            disabled={disabled || isPending}
            placeholder="8"
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs text-daet-ink/55">Whole number only.</span>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-daet-ink">
            Duration unit <span className="text-rose-600">*</span>
          </span>
          <select
            name="durationType"
            value={values.durationType}
            onChange={(event) => update("durationType", event.target.value as "hours" | "days")}
            disabled={disabled || isPending}
            className={INPUT_CLASS}
          >
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-daet-ink">Description</span>
          <textarea
            name="description"
            rows={4}
            maxLength={2000}
            value={values.description}
            onChange={(event) => update("description", event.target.value)}
            disabled={disabled || isPending}
            placeholder="What travellers experience, who it suits, and what makes it special."
            className={TEXTAREA_CLASS}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-daet-ink">Inclusions</span>
          <textarea
            name="inclusions"
            rows={4}
            value={values.inclusions}
            onChange={(event) => update("inclusions", event.target.value)}
            disabled={disabled || isPending}
            placeholder={"One item per line\nBoat rental\nLicensed guide"}
            className={TEXTAREA_CLASS}
          />
          <span className="mt-1 block text-xs text-daet-ink/55">One item per line.</span>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-daet-ink">Exclusions</span>
          <textarea
            name="exclusions"
            rows={3}
            value={values.exclusions}
            onChange={(event) => update("exclusions", event.target.value)}
            disabled={disabled || isPending}
            placeholder={"One item per line\nPersonal expenses"}
            className={TEXTAREA_CLASS}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-daet-ink">Cover image reference</span>
          <input
            name="coverImageUrl"
            value={values.coverImageUrl}
            onChange={(event) => update("coverImageUrl", event.target.value)}
            disabled={disabled || isPending}
            maxLength={2048}
            placeholder="Storage path or image URL"
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs text-daet-ink/55">
            Package media upload is not part of this milestone, so this stores the reference you provide.
          </span>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-daet-ink">Gallery references</span>
          <textarea
            name="galleryUrls"
            rows={3}
            value={values.galleryUrls}
            onChange={(event) => update("galleryUrls", event.target.value)}
            disabled={disabled || isPending}
            placeholder="One storage path or image URL per line"
            className={TEXTAREA_CLASS}
          />
        </label>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-daet-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/tours/operator/packages"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-daet-ink/15 px-6 text-sm font-bold text-daet-ink transition hover:bg-daet-sand"
        >
          Back to packages
        </a>
        <button
          type="submit"
          disabled={disabled || isPending}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : packageId ? "Save details" : "Create draft package"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replacePriceVariants } from "@/app/(subsystems)/tours/operator/packages/actions";
import type { PriceVariantInput } from "@/lib/tours/package-contract";
import { Notice } from "@/components/ui/notice";

/** Row state is strings so optional numeric fields can stay blank. */
interface VariantRow {
  variantName: string;
  minPax: string;
  maxPax: string;
  pricePerPax: string;
  flatPrice: string;
  isDefault: boolean;
}

const INPUT_CLASS =
  "mt-2 min-h-11 w-full rounded-xl border border-daet-ink/15 bg-white px-3 text-sm outline-none transition placeholder:text-daet-ink/35 focus:border-daet-forest focus:ring-4 focus:ring-daet-forest/10";

function toRow(variant: PriceVariantInput | Record<string, unknown>): VariantRow {
  return {
    variantName: String(variant.variantName ?? ""),
    minPax: variant.minPax === null || variant.minPax === undefined ? "" : String(variant.minPax),
    maxPax: variant.maxPax === null || variant.maxPax === undefined ? "" : String(variant.maxPax),
    pricePerPax:
      variant.pricePerPax === null || variant.pricePerPax === undefined
        ? ""
        : String(variant.pricePerPax),
    flatPrice:
      variant.flatPrice === null || variant.flatPrice === undefined ? "" : String(variant.flatPrice),
    isDefault: Boolean(variant.isDefault),
  };
}

const EMPTY_ROW: VariantRow = {
  variantName: "",
  minPax: "1",
  maxPax: "",
  pricePerPax: "",
  flatPrice: "",
  isDefault: false,
};

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/** Parses rows into RPC input, or returns the first validation message. */
function parseRows(rows: VariantRow[]): { data?: PriceVariantInput[]; error?: string } {
  if (rows.length === 0) return { error: "Add at least one price variant." };

  const variants: PriceVariantInput[] = [];
  for (const [index, row] of rows.entries()) {
    const label = `Variant ${index + 1}`;
    if (!row.variantName.trim()) return { error: `${label}: a name is required.` };

    const minPax = Number(row.minPax);
    if (!Number.isInteger(minPax) || minPax < 1) {
      return { error: `${label}: minimum pax must be a whole number of 1 or more.` };
    }

    const maxPax = optionalNumber(row.maxPax);
    if (maxPax !== null && (!Number.isInteger(maxPax) || maxPax < minPax)) {
      return { error: `${label}: maximum pax must be a whole number no lower than the minimum.` };
    }

    const pricePerPax = optionalNumber(row.pricePerPax);
    const flatPrice = optionalNumber(row.flatPrice);
    if (
      (pricePerPax !== null && (!Number.isFinite(pricePerPax) || pricePerPax < 0)) ||
      (flatPrice !== null && (!Number.isFinite(flatPrice) || flatPrice < 0))
    ) {
      return { error: `${label}: prices must be zero or more.` };
    }
    if (pricePerPax === null && flatPrice === null) {
      return { error: `${label}: set either a price per pax or a flat price.` };
    }

    variants.push({
      variantName: row.variantName.trim(),
      minPax,
      maxPax,
      pricePerPax,
      flatPrice,
      isDefault: row.isDefault,
    });
  }

  if (variants.filter((variant) => variant.isDefault).length !== 1) {
    return { error: "Mark exactly one variant as the default." };
  }
  return { data: variants };
}

export function PackageVariantsForm({
  packageId,
  initialVariants,
  disabled = false,
}: {
  packageId: string;
  initialVariants: PriceVariantInput[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<VariantRow[]>(() =>
    initialVariants.length > 0 ? initialVariants.map(toRow) : [{ ...EMPTY_ROW, isDefault: true }],
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function patchRow(index: number, patch: Partial<VariantRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setError("");
    setSaved(false);
  }

  function setDefault(index: number) {
    setRows((current) => current.map((row, i) => ({ ...row, isDefault: i === index })));
    setError("");
    setSaved(false);
  }

  function addRow() {
    setRows((current) => [...current, { ...EMPTY_ROW }]);
    setError("");
    setSaved(false);
  }

  function removeRow(index: number) {
    setRows((current) => {
      const next = current.filter((_, i) => i !== index);
      // Keep exactly one default so the save cannot fail on a missing default.
      if (next.length > 0 && !next.some((row) => row.isDefault)) {
        return next.map((row, i) => ({ ...row, isDefault: i === 0 }));
      }
      return next;
    });
    setError("");
    setSaved(false);
  }

  function handleSave() {
    if (isPending || disabled) return;
    setError("");
    setSaved(false);

    const parsed = parseRows(rows);
    if (!parsed.data) {
      setError(parsed.error ?? "Check your price variants.");
      return;
    }

    startTransition(async () => {
      const result = await replacePriceVariants(packageId, parsed.data as PriceVariantInput[]);
      if (!result.success) {
        setError(result.error ?? "Could not save price variants. Please try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-daet-ink/10 bg-white p-5 shadow-card sm:p-8">
      <h2 className="text-xl font-black text-daet-ink">Pricing</h2>
      <p className="mt-1 text-sm leading-6 text-daet-ink/65">
        Add a variant for each group size or tier. Saving replaces the whole list, and exactly one
        variant must be the default.
      </p>

      {error ? (
        <Notice variant="error" title="Check your pricing" className="mt-5">
          {error}
        </Notice>
      ) : null}
      {saved ? (
        <Notice variant="success" title="Pricing saved" className="mt-5">
          Your price variants were saved to this draft.
        </Notice>
      ) : null}

      <div className="mt-6 grid gap-4">
        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-2xl border border-daet-ink/10 bg-daet-sand/40 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-daet-ink/50">
                Variant {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled || isPending || rows.length === 1}
                className="inline-flex min-h-11 items-center rounded-full border border-daet-ink/15 px-4 text-xs font-bold text-daet-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>

            <label className="mt-3 block">
              <span className="text-sm font-bold text-daet-ink">Variant name</span>
              <input
                value={row.variantName}
                onChange={(event) => patchRow(index, { variantName: event.target.value })}
                disabled={disabled || isPending}
                maxLength={120}
                placeholder="e.g. Standard, Group of 5"
                className={INPUT_CLASS}
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-daet-ink">Min pax</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={row.minPax}
                  onChange={(event) => patchRow(index, { minPax: event.target.value })}
                  disabled={disabled || isPending}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-daet-ink">Max pax</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={row.maxPax}
                  onChange={(event) => patchRow(index, { maxPax: event.target.value })}
                  disabled={disabled || isPending}
                  placeholder="Optional"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-daet-ink">Price per pax</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={row.pricePerPax}
                  onChange={(event) => patchRow(index, { pricePerPax: event.target.value })}
                  disabled={disabled || isPending}
                  placeholder="Optional"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-daet-ink">Flat price</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={row.flatPrice}
                  onChange={(event) => patchRow(index, { flatPrice: event.target.value })}
                  disabled={disabled || isPending}
                  placeholder="Optional"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-white px-3">
              <input
                type="radio"
                name="defaultVariant"
                checked={row.isDefault}
                onChange={() => setDefault(index)}
                disabled={disabled || isPending}
                className="h-5 w-5 accent-daet-forest"
              />
              <span className="text-sm font-bold text-daet-ink">Default variant</span>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-daet-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addRow}
          disabled={disabled || isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-daet-ink/15 px-6 text-sm font-bold text-daet-ink transition hover:bg-daet-sand disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add variant
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save pricing"}
        </button>
      </div>
    </section>
  );
}

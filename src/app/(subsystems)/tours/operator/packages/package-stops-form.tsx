"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replacePackageStops } from "@/app/(subsystems)/tours/operator/packages/actions";
import type { PackageStopInput } from "@/lib/tours/package-contract";
import { Notice } from "@/components/ui/notice";

interface StopRow {
  locationName: string;
  latitude: string;
  longitude: string;
  description: string;
  estimatedDurationMinutes: string;
}

const INPUT_CLASS =
  "mt-2 min-h-11 w-full rounded-xl border border-daet-ink/15 bg-white px-3 text-sm outline-none transition placeholder:text-daet-ink/35 focus:border-daet-forest focus:ring-4 focus:ring-daet-forest/10";

const EMPTY_ROW: StopRow = {
  locationName: "",
  latitude: "",
  longitude: "",
  description: "",
  estimatedDurationMinutes: "",
};

function toRow(stop: PackageStopInput): StopRow {
  return {
    locationName: String(stop.locationName ?? ""),
    latitude: stop.latitude === null || stop.latitude === undefined ? "" : String(stop.latitude),
    longitude: stop.longitude === null || stop.longitude === undefined ? "" : String(stop.longitude),
    description: stop.description ?? "",
    estimatedDurationMinutes:
      stop.estimatedDurationMinutes === null || stop.estimatedDurationMinutes === undefined
        ? ""
        : String(stop.estimatedDurationMinutes),
  };
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/**
 * Stop order is the array position; the database assigns stop_order from the
 * ordinality, so the client never sends an order value of its own.
 */
function parseRows(rows: StopRow[]): { data?: PackageStopInput[]; error?: string } {
  if (rows.length === 0) return { error: "Add at least one map stop." };

  const stops: PackageStopInput[] = [];
  for (const [index, row] of rows.entries()) {
    const label = `Stop ${index + 1}`;
    if (!row.locationName.trim()) return { error: `${label}: a location name is required.` };

    const latitude = Number(row.latitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return { error: `${label}: latitude must be between -90 and 90.` };
    }
    const longitude = Number(row.longitude);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return { error: `${label}: longitude must be between -180 and 180.` };
    }

    const minutes = optionalNumber(row.estimatedDurationMinutes);
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0)) {
      return { error: `${label}: estimated duration must be a whole number of minutes, 0 or more.` };
    }

    stops.push({
      locationName: row.locationName.trim(),
      latitude,
      longitude,
      description: row.description.trim() || null,
      estimatedDurationMinutes: minutes,
    });
  }
  return { data: stops };
}

export function PackageStopsForm({
  packageId,
  initialStops,
  disabled = false,
}: {
  packageId: string;
  initialStops: PackageStopInput[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<StopRow[]>(() =>
    initialStops.length > 0 ? initialStops.map(toRow) : [{ ...EMPTY_ROW }],
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function patchRow(index: number, patch: Partial<StopRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setError("");
    setSaved(false);
  }

  function move(index: number, direction: -1 | 1) {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setError("");
    setSaved(false);
  }

  function addRow() {
    setRows((current) => [...current, { ...EMPTY_ROW }]);
    setError("");
    setSaved(false);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setError("");
    setSaved(false);
  }

  function handleSave() {
    if (isPending || disabled) return;
    setError("");
    setSaved(false);

    const parsed = parseRows(rows);
    if (!parsed.data) {
      setError(parsed.error ?? "Check your map stops.");
      return;
    }

    startTransition(async () => {
      const result = await replacePackageStops(packageId, parsed.data as PackageStopInput[]);
      if (!result.success) {
        setError(result.error ?? "Could not save map stops. Please try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-daet-ink/10 bg-white p-5 shadow-card sm:p-8">
      <h2 className="text-xl font-black text-daet-ink">Map stops</h2>
      <p className="mt-1 text-sm leading-6 text-daet-ink/65">
        The order below is the itinerary order travellers see. Use the arrows to reorder; saving
        replaces the whole list.
      </p>

      {error ? (
        <Notice variant="error" title="Check your map stops" className="mt-5">
          {error}
        </Notice>
      ) : null}
      {saved ? (
        <Notice variant="success" title="Map stops saved" className="mt-5">
          Your itinerary order and stop details were saved to this draft.
        </Notice>
      ) : null}

      <ol className="mt-6 grid gap-4">
        {rows.map((row, index) => (
          <li key={index} className="rounded-2xl border border-daet-ink/10 bg-daet-sand/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-daet-ink/50">
                Stop {index + 1}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={disabled || isPending || index === 0}
                  aria-label={`Move stop ${index + 1} up`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-daet-ink/15 px-3 text-sm font-bold text-daet-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={disabled || isPending || index === rows.length - 1}
                  aria-label={`Move stop ${index + 1} down`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-daet-ink/15 px-3 text-sm font-bold text-daet-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={disabled || isPending || rows.length === 1}
                  className="inline-flex min-h-11 items-center rounded-full border border-daet-ink/15 px-4 text-xs font-bold text-daet-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="text-sm font-bold text-daet-ink">Location name</span>
              <input
                value={row.locationName}
                onChange={(event) => patchRow(index, { locationName: event.target.value })}
                disabled={disabled || isPending}
                maxLength={160}
                placeholder="e.g. Bagasbas Beach"
                className={INPUT_CLASS}
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-bold text-daet-ink">Latitude</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-90}
                  max={90}
                  value={row.latitude}
                  onChange={(event) => patchRow(index, { latitude: event.target.value })}
                  disabled={disabled || isPending}
                  placeholder="14.1086"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-daet-ink">Longitude</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-180}
                  max={180}
                  value={row.longitude}
                  onChange={(event) => patchRow(index, { longitude: event.target.value })}
                  disabled={disabled || isPending}
                  placeholder="122.9398"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="text-sm font-bold text-daet-ink">Description</span>
              <input
                value={row.description}
                onChange={(event) => patchRow(index, { description: event.target.value })}
                disabled={disabled || isPending}
                maxLength={500}
                placeholder="Optional"
                className={INPUT_CLASS}
              />
            </label>

            <label className="mt-3 block">
              <span className="text-sm font-bold text-daet-ink">Estimated minutes</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={row.estimatedDurationMinutes}
                onChange={(event) =>
                  patchRow(index, { estimatedDurationMinutes: event.target.value })
                }
                disabled={disabled || isPending}
                placeholder="Optional"
                className={INPUT_CLASS}
              />
            </label>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-daet-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addRow}
          disabled={disabled || isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-daet-ink/15 px-6 text-sm font-bold text-daet-ink transition hover:bg-daet-sand disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add stop
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || isPending}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-daet-forest px-7 text-sm font-bold text-white shadow-sm transition hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save map stops"}
        </button>
      </div>
    </section>
  );
}

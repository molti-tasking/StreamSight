import type { DataProcessingSettings } from "../settings/DataProcessingSettings";
import type { ClusteringSettings, ClusterRow } from "./clusterTypes";

/** Window length used when the settings do not specify a positive one. */
export const DEFAULT_DATA_TICKS = 50;
export const DEFAULT_MIN_PTS = 2;

export type TimeRange = { from: number; to: number };

/** The temporal-navigation range, when the user selected one. */
export function selectedRange(nav: {
  mode: "latest" | "range";
  from?: number;
  to?: number;
}): TimeRange | undefined {
  return nav.mode === "range" && nav.from !== undefined && nav.to !== undefined
    ? { from: nav.from, to: nav.to }
    : undefined;
}

/**
 * The single place that turns the user's processing settings (plus the
 * selected time range, if any) into the settings the clustering receives.
 * Every clustering call — the live view, the clusters-over-time view and the
 * benchmark — goes through here, so they cannot drift apart.
 */
export function buildClusteringSettings(
  processing: Pick<
    DataProcessingSettings,
    "eps" | "minPts" | "zNormalize" | "dataTicks"
  >,
  range?: TimeRange
): ClusteringSettings & { minPts: number; zNormalize: boolean; dataTicks: number } {
  return {
    eps: processing.eps,
    minPts: Math.max(1, processing.minPts ?? DEFAULT_MIN_PTS),
    zNormalize: processing.zNormalize ?? true,
    dataTicks:
      processing.dataTicks && processing.dataTicks > 0
        ? processing.dataTicks
        : DEFAULT_DATA_TICKS,
    ...(range ? { timeScale: range } : {}),
  };
}

/**
 * The rows a clustering looks at: those inside `timeScale` when a range is
 * selected, otherwise the most recent `dataTicks` rows. Mirrors the window
 * selection in the Rust `aggregator`, and lets callers slice before sending
 * rows to the worker.
 */
export function selectWindow<T extends ClusterRow>(
  rows: T[],
  settings: Pick<ClusteringSettings, "dataTicks" | "timeScale">
): T[] {
  if (settings.timeScale) {
    const { from, to } = settings.timeScale;
    return rows.filter((row) => row.timestamp >= from && row.timestamp <= to);
  }
  const ticks = settings.dataTicks;
  if (!ticks || ticks <= 0 || ticks >= rows.length) return rows;
  return rows.slice(rows.length - ticks);
}

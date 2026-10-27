import { ClusterRow } from "./clusterTypes";

/** Reserved cluster id for DBSCAN noise / outlier streams. */
export const OUTLIER_ID = -1;

/**
 * Result of assembling a clustering from a flat per-dimension assignment.
 *
 * `aggregated` / `clusterIds` are index-aligned: `clusterIds[i]` is the cluster
 * key that produced `aggregated[i]`. `clusterAssignment` maps each
 * dimension to its *position index* in `aggregated` (noise streams point at
 * the trailing Outliers cluster).
 */
export type AssembledClusters = {
  aggregated: ClusterRow[][];
  clusterIds: number[];
  yDomain: [number, number];
  clusterAssignment: [string, number][];
};

const TIMESTAMP_KEY = "timestamp";

/**
 * Re-group a window (rows keyed by timestamp) into per-dimension time series
 * (`timestamp -> value`). Mirrors the regrouping in the Rust
 * `clustering_data` so the JS assembly reproduces the WASM rows.
 */
function buildSeries(
  window: ClusterRow[],
  dimensions: string[]
): Map<string, Map<number, number>> {
  const series = new Map<string, Map<number, number>>();
  for (const dim of dimensions) series.set(dim, new Map());
  for (const row of window) {
    const ts = row[TIMESTAMP_KEY];
    if (ts === undefined) continue;
    for (const dim of dimensions) {
      const value = row[dim];
      if (value !== undefined) series.get(dim)!.set(ts, value);
    }
  }
  return series;
}

/**
 * Shared y-axis domain across every non-timestamp value in the window. Mirrors
 * the y-domain loop in the Rust `aggregator_internal`.
 */
export function computeYDomain(window: ClusterRow[]): [number, number] {
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const row of window) {
    for (const key in row) {
      if (key === TIMESTAMP_KEY) continue;
      const value = row[key];
      if (!Number.isFinite(value)) continue;
      if (value < yMin) yMin = value;
      if (value > yMax) yMax = value;
    }
  }
  return yMin > yMax ? [0, 1] : [yMin, yMax];
}

/**
 * Assemble the renderable cluster structure from a window plus a flat
 * `dimension -> clusterKey` assignment. This is the JS counterpart of the
 * grouping the Rust `aggregator` used to bake in: by moving it out of WASM we
 * can apply stable-ID remapping, manual overrides, and adaptive ordering as
 * plain (testable) transforms on the assignment before assembly, without making
 * the WASM module stateful.
 *
 * When driven with the WASM's own `clusterAssignment` (dimension -> position),
 * the real clusters are identical to `wasmAggregator` — see
 * `assembleClusters.test.ts`.
 *
 * Cluster keys `< 0` (DBSCAN noise) are collected into one trailing Outliers
 * cluster whose `clusterIds` entry is `OUTLIER_ID`.
 */
export function assembleClusters(
  window: ClusterRow[],
  dimensions: string[],
  assignment: Map<string, number>
): AssembledClusters {
  const yDomain = computeYDomain(window);

  // Group member dimensions by their cluster key, preserving dimension order so
  // the first member of each cluster is its lowest-index dimension — exactly the
  // DBSCAN seed the Rust port uses as `cluster[0]` for timestamp sourcing.
  // Dimensions keyed OUTLIER_ID are collected into a single trailing noise
  // cluster; any other negative key is dropped.
  const groups = new Map<number, string[]>();
  const noiseMembers: string[] = [];
  for (const dim of dimensions) {
    const key = assignment.get(dim);
    if (key === undefined) continue;
    if (key === OUTLIER_ID) {
      noiseMembers.push(dim);
      continue;
    }
    if (key < 0) continue;
    let members = groups.get(key);
    if (!members) {
      members = [];
      groups.set(key, members);
    }
    members.push(dim);
  }

  // Ascending cluster key == DBSCAN discovery order for the WASM-driven path.
  const clusterKeys = [...groups.keys()].sort((a, b) => a - b);
  const series = buildSeries(window, dimensions);

  const buildRows = (members: string[]): ClusterRow[] => {
    const firstSeries = series.get(members[0])!;
    const timestamps = [...firstSeries.keys()].sort((a, b) => a - b);
    return timestamps.map((ts) => {
      const entry: ClusterRow = { timestamp: ts };
      for (const member of members) {
        const value = series.get(member)!.get(ts);
        if (value !== undefined) entry[member] = value;
      }
      return entry;
    });
  };

  const aggregated: ClusterRow[][] = [];
  const clusterIds: number[] = [];
  for (const key of clusterKeys) {
    aggregated.push(buildRows(groups.get(key)!));
    clusterIds.push(key);
  }
  // Append the outliers as a single trailing cluster, if any.
  if (noiseMembers.length > 0) {
    aggregated.push(buildRows(noiseMembers));
    clusterIds.push(OUTLIER_ID);
  }

  const positionByKey = new Map<number, number>();
  clusterKeys.forEach((key, index) => positionByKey.set(key, index));
  const outlierPosition = noiseMembers.length > 0 ? aggregated.length - 1 : -1;
  const clusterAssignment: [string, number][] = dimensions.map((dim) => {
    const key = assignment.get(dim);
    if (key === OUTLIER_ID) return [dim, outlierPosition];
    const position =
      key === undefined || key < 0 ? -1 : positionByKey.get(key) ?? -1;
    return [dim, position];
  });

  return { aggregated, clusterIds, yDomain, clusterAssignment };
}

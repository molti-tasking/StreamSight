import { ClusterRow } from "./clusterTypes";
import { HighlightInfo } from "./highlighting";

/**
 * How clusters are ordered (and thus prioritized) on screen.
 * - `stable`: by stable id, so clusters keep a fixed position (least visual jitter).
 * - `size`: largest clusters first.
 * - `variance`: most variable (interesting) clusters first.
 * - `churn`: clusters with the most recent membership changes first.
 * Outliers (id < 0) are always placed last.
 */
export type ClusterOrderMode = "stable" | "size" | "variance" | "churn";

export const clusterOrderOptions: Record<ClusterOrderMode, string> = {
  stable: "Stable",
  size: "Size",
  variance: "Variance",
  churn: "Recent changes",
};

function streamKeys(cluster: ClusterRow[]): string[] {
  if (!cluster.length) return [];
  return Object.keys(cluster[0]).filter((key) => key !== "timestamp");
}

export function clusterSize(cluster: ClusterRow[]): number {
  return streamKeys(cluster).length;
}

/** Mean per-stream variance across the cluster's window. */
export function clusterVariance(cluster: ClusterRow[]): number {
  const keys = streamKeys(cluster);
  if (keys.length === 0) return 0;
  let total = 0;
  for (const key of keys) {
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (const row of cluster) {
      const value = row[key];
      if (value === undefined) continue;
      sum += value;
      sumSq += value * value;
      n++;
    }
    if (n > 0) {
      const mean = sum / n;
      total += Math.max(0, sumSq / n - mean * mean);
    }
  }
  return total / keys.length;
}

/**
 * Reorder clusters (and their index-aligned `clusterIds` / `highlightInfo`) by
 * the chosen significance metric, keeping outliers last. Coloring is keyed by
 * stable id, so reordering never recolors a cluster.
 */
export function orderClusters(
  aggregated: ClusterRow[][],
  clusterIds: number[],
  highlightInfo: HighlightInfo[][],
  mode: ClusterOrderMode
): {
  aggregated: ClusterRow[][];
  clusterIds: number[];
  highlightInfo: HighlightInfo[][];
} {
  const order = aggregated.map((_, i) => i);

  const score = (i: number): number => {
    switch (mode) {
      case "size":
        return clusterSize(aggregated[i]);
      case "variance":
        return clusterVariance(aggregated[i]);
      case "churn":
        return (highlightInfo[i] ?? []).reduce((s, h) => s + h.opacity, 0);
      default:
        return 0;
    }
  };

  order.sort((a, b) => {
    const aOutlier = clusterIds[a] < 0 ? 1 : 0;
    const bOutlier = clusterIds[b] < 0 ? 1 : 0;
    if (aOutlier !== bOutlier) return aOutlier - bOutlier;
    if (mode === "stable") return clusterIds[a] - clusterIds[b];
    // Highest significance first; tie-break by stable id for determinism.
    return score(b) - score(a) || clusterIds[a] - clusterIds[b];
  });

  return {
    aggregated: order.map((i) => aggregated[i]),
    clusterIds: order.map((i) => clusterIds[i]),
    highlightInfo: order.map((i) => highlightInfo[i] ?? []),
  };
}

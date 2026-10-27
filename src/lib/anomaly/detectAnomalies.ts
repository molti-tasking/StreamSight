import { ClusterRow } from "../clustering/clusterTypes";

export type AnomalyType = "spike" | "drop" | "regime-change";

export type AnomalyEvent = {
  timestamp: number;
  dimension: string;
  /** Stable cluster id the stream belonged to when the anomaly fired. */
  clusterId: number;
  type: AnomalyType;
  /** Robust z-score of the deviation (how many MADs from the median). */
  magnitude: number;
  /** Human-readable, auto-generated label. */
  label: string;
};

export type AnomalyOptions = {
  /** Robust z-score above which the latest point is flagged. */
  zThreshold?: number;
  /** Minimum points in a stream's window before it can be scored. */
  minPoints?: number;
};

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Detect per-stream point anomalies in the current window using a robust
 * (median / MAD) z-score, which is far less sensitive to the very peaks it is
 * meant to catch than mean / std. The latest point of each stream is compared
 * against the distribution of the preceding points; large deviations become
 * labelled spike/drop events.
 *
 * Membership-change ("regime-change") events are produced separately from the
 * highlight info (see `regimeChangeEvents`).
 */
export function detectAnomalies(
  aggregated: ClusterRow[][],
  clusterIds: number[],
  { zThreshold = 3.5, minPoints = 5 }: AnomalyOptions = {}
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];

  for (let ci = 0; ci < aggregated.length; ci++) {
    const cluster = aggregated[ci];
    const clusterId = clusterIds[ci] ?? ci;
    if (cluster.length < minPoints) continue;

    const last = cluster[cluster.length - 1];
    const timestamp = last.timestamp;
    const keys = Object.keys(cluster[0]).filter((k) => k !== "timestamp");

    for (const key of keys) {
      const history: number[] = [];
      for (let r = 0; r < cluster.length - 1; r++) {
        const v = cluster[r][key];
        if (v !== undefined) history.push(v);
      }
      const current = last[key];
      if (current === undefined || history.length < minPoints) continue;

      const sorted = [...history].sort((a, b) => a - b);
      const med = median(sorted);
      const absDev = sorted.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
      const mad = median(absDev);
      // 1.4826 scales MAD to be comparable to a standard deviation. MAD can
      // collapse to 0 on low-variance windows (where it would still mask an
      // obvious spike), so fall back to the standard deviation in that case.
      let sigma = mad * 1.4826;
      if (sigma === 0) {
        const mean = history.reduce((s, v) => s + v, 0) / history.length;
        const variance =
          history.reduce((s, v) => s + (v - mean) * (v - mean), 0) /
          history.length;
        sigma = Math.sqrt(variance);
      }
      if (sigma === 0) continue; // truly constant window — nothing to compare

      const z = (current - med) / sigma;
      if (Math.abs(z) < zThreshold) continue;

      const pct = med !== 0 ? ((current - med) / Math.abs(med)) * 100 : 0;
      const type: AnomalyType = z > 0 ? "spike" : "drop";
      const sign = pct >= 0 ? "+" : "";
      events.push({
        timestamp,
        dimension: key,
        clusterId,
        type,
        magnitude: z,
        label: `${key}: ${type} ${sign}${pct.toFixed(0)}% (z=${z.toFixed(1)})`,
      });
    }
  }

  return events;
}

/**
 * Turn cluster-membership changes (from the highlight info) into labelled
 * regime-change events, so a stream jumping clusters is reported alongside
 * value anomalies.
 */
export function regimeChangeEvents(
  highlightInfo: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[][],
  clusterIds: number[],
  timestamp: number
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];
  highlightInfo.forEach((cluster, ci) => {
    const clusterId = clusterIds[ci] ?? ci;
    for (const { dimension, opacity, lastDimension } of cluster) {
      if (lastDimension === undefined) continue;
      events.push({
        timestamp,
        dimension,
        clusterId,
        type: "regime-change",
        magnitude: opacity,
        label: `${dimension}: moved from cluster ${lastDimension}`,
      });
    }
  });
  return events;
}

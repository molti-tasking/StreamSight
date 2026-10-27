export type ClusterRow = Record<string, number>;

export type AggregatedProps = {
  aggregated: ClusterRow[][];
  yDomain: [number, number];
  clusterAssignment: [string, number][];
};

export type ClusterView = { timestamp: string; clusters: [string, number][] };

export type ClusteringSettings = {
  eps: number;
  /** Most recent N ticks to cluster. */
  dataTicks?: number;
  /**
   * Minimum core-point neighbourhood size for DBSCAN. When omitted (or 0) the
   * legacy clustering runs; when > 0, textbook DBSCAN runs and outliers are
   * labelled noise (cluster index -1).
   */
  minPts?: number;
  /**
   * Explicit time-range window (multi-scale timelines). When set, rows are
   * selected by timestamp instead of by `dataTicks`.
   */
  timeScale?: { from: number; to: number };
};

/**
 * Coerce a streamed row into finite numbers keyed by column. Loaded datasets can
 * contain `null` (missing values); the original JS clustering treated those as 0
 * via arithmetic coercion, so we replicate that here before handing data to WASM
 * (which only accepts `f64`).
 */
export function sanitizeRows(rawData: ClusterRow[]): ClusterRow[] {
  return rawData.map((row) => {
    const clean: ClusterRow = {};
    for (const key in row) {
      const value = row[key];
      clean[key] = Number.isFinite(value) ? (value as number) : 0;
    }
    return clean;
  });
}

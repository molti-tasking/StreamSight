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
   * DBSCAN minPts: minimum eps-neighbourhood size (including the stream
   * itself) for a core point. Streams that are neither core nor reachable
   * from a core point are noise (cluster index -1). Defaults to 2 in WASM.
   */
  minPts?: number;
  /**
   * Z-normalize each stream over the window before computing distances, so
   * clusters reflect shape rather than level/scale. Defaults to true in WASM.
   */
  zNormalize?: boolean;
  /**
   * Explicit time-range window (multi-scale timelines). When set, rows are
   * selected by timestamp instead of by `dataTicks`.
   */
  timeScale?: { from: number; to: number };
};

/**
 * Drop missing values from streamed rows before handing them to WASM (which
 * only accepts `f64`). Loaded datasets can contain `null`/`NaN`; those keys are
 * omitted, never replaced by 0, so the clustering distance skips them.
 */
export function sanitizeRows(rawData: ClusterRow[]): ClusterRow[] {
  return rawData.map((row) => {
    const clean: ClusterRow = {};
    for (const key in row) {
      const value = row[key];
      if (Number.isFinite(value)) clean[key] = value as number;
    }
    return clean;
  });
}

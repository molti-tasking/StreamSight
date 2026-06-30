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

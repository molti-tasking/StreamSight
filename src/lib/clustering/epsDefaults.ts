/**
 * Default DBSCAN eps per distance mode, chosen with the benchmark sweep
 * (bench/results-eps.csv, summarized by `node bench/summarize.mjs eps`).
 *
 * With z-normalization the distance between two streams is the RMS difference
 * of their z-scores, which for streams observed at the same ticks equals
 * sqrt(2 * (1 - r)) with r their Pearson correlation. eps therefore means the
 * same thing on every dataset: streams within eps correlate at least
 * `correlationForEps(eps)`. On planted clusters, eps 0.6 (r >= 0.82) recovers
 * the clusters with mean ARI >= 0.9 for every tested window (20, 50, 100
 * ticks) at noise sigma <= 0.5; no single eps does so at sigma 0.8.
 *
 * Without normalization eps is an RMS difference in the data's own units.
 * When streams share level and scale, the sweep's best raw eps is the
 * z-normalized one times the streams' standard deviation, so the raw default
 * is derived from the data the same way. (When levels or scales differ
 * between streams, raw clustering fails at every eps; ARI <= 0.03.)
 */
export const DEFAULT_EPS_Z_NORMALIZED = 0.6;

/** Minimum Pearson correlation of two z-normalized streams within `eps`. */
export const correlationForEps = (eps: number): number => 1 - (eps * eps) / 2;

/**
 * Raw-mode eps for the given rows: DEFAULT_EPS_Z_NORMALIZED times the median
 * standard deviation of the streams (1 when there is no data yet).
 */
export function rawEpsFor(
  rows: Record<string, number>[],
  dimensions: string[]
): number {
  const stds = dimensions
    .map((dim) => {
      const values = rows.map((row) => row[dim]).filter(Number.isFinite);
      if (values.length < 2) return NaN;
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    })
    .filter((std) => Number.isFinite(std) && std > 0)
    .sort((a, b) => a - b);
  if (!stds.length) return 1;
  const median = stds[Math.floor(stds.length / 2)];
  return Number((DEFAULT_EPS_Z_NORMALIZED * median).toPrecision(2));
}

export const defaultEps = (
  zNormalize: boolean,
  rows: Record<string, number>[] = [],
  dimensions: string[] = []
): number => (zNormalize ? DEFAULT_EPS_Z_NORMALIZED : rawEpsFor(rows, dimensions));

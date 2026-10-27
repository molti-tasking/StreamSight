/**
 * Default DBSCAN eps per distance mode.
 *
 * With z-normalization the distance between two streams is the RMS difference
 * of their z-scores, which for streams observed at the same ticks equals
 * sqrt(2 * (1 - r)) with r their Pearson correlation. eps therefore means the
 * same thing on every dataset: streams within eps correlate at least
 * `correlationForEps(eps)`.
 *
 * Without normalization eps is an RMS difference in the data's own units, so a
 * sensible value depends on the dataset.
 */
export const DEFAULT_EPS_Z_NORMALIZED = 0.6;
export const DEFAULT_EPS_RAW = 10;

export const defaultEps = (zNormalize: boolean): number =>
  zNormalize ? DEFAULT_EPS_Z_NORMALIZED : DEFAULT_EPS_RAW;

/** Minimum Pearson correlation of two z-normalized streams within `eps`. */
export const correlationForEps = (eps: number): number => 1 - (eps * eps) / 2;

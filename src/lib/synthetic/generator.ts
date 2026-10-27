/**
 * Seeded synthetic stream generator with known ground truth.
 *
 * Every stream follows one of `nClusters` independent prototype signals plus
 * its own white noise, under its own positive affine transform (level and
 * scale differ, the shape is shared). Outlier streams follow their own
 * private signal. The ground truth says which cluster each stream belongs to
 * (-1 for outliers), so clustering quality can be scored with the adjusted
 * Rand index.
 *
 * Zero imports and only erasable TypeScript, so Node can import this file
 * directly (benchmarks) and the app can use it unchanged.
 */

export type SyntheticConfig = {
  seed: number;
  nStreams: number;
  nTicks: number;
  nClusters: number;
  /**
   * Standard deviation of each stream's white noise, relative to its
   * prototype's (unit) standard deviation. Two members of a cluster then
   * correlate about 1 / (1 + noiseSigma²).
   */
  noiseSigma?: number;
  /** Streams that follow no cluster (ground-truth label -1). */
  outlierStreams?: number;
  /** Probability that a single value is missing (omitted from its row). */
  missingRate?: number;
  /** Range of the per-stream scale factor (positive, so shapes are kept). */
  scaleRange?: [number, number];
  /** Range of the per-stream level offset. */
  offsetRange?: [number, number];
  startTime?: number;
  intervalMs?: number;
};

export type SyntheticRow = { timestamp: number } & Record<string, number>;

export type SyntheticDataset = {
  config: Required<SyntheticConfig>;
  dimensions: string[];
  rows: SyntheticRow[];
  truth: {
    /** Cluster of each stream (index-aligned with `dimensions`), -1 = outlier. */
    labels: number[];
  };
};

export const DEFAULT_SYNTHETIC: Omit<
  Required<SyntheticConfig>,
  "seed" | "nStreams" | "nTicks" | "nClusters"
> = {
  noiseSigma: 0.3,
  outlierStreams: 0,
  missingRate: 0,
  scaleRange: [0.5, 5],
  offsetRange: [-50, 50],
  startTime: 0,
  intervalMs: 1000,
};

/** mulberry32: small, fast, seedable 32-bit PRNG returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box–Muller. */
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const uniform = (rand: () => number, [lo, hi]: [number, number]) =>
  lo + (hi - lo) * rand();

/**
 * A prototype signal with structure at the scale of a typical clustering
 * window (tens of ticks): an AR(1) process (phi 0.6) plus a sinusoid with a
 * random period of 8-40 ticks, scaled to unit variance. Independent draws are
 * practically uncorrelated over windows of 20+ ticks.
 */
function prototype(rand: () => number, nTicks: number): number[] {
  const period = 8 + 32 * rand();
  const phase = 2 * Math.PI * rand();
  const values: number[] = [];
  let ar = 0;
  for (let t = 0; t < nTicks; t++) {
    ar = 0.6 * ar + gaussian(rand);
    values.push(ar / 1.25 + Math.SQRT2 * Math.sin((2 * Math.PI * t) / period + phase));
  }
  const mean = values.reduce((s, v) => s + v, 0) / nTicks;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / nTicks) || 1;
  return values.map((v) => (v - mean) / std);
}

export const streamName = (i: number, nStreams: number) =>
  `s${String(i).padStart(String(Math.max(nStreams - 1, 1)).length, "0")}`;

/** Generates a dataset; the same config always yields the same data. */
export function generateSynthetic(input: SyntheticConfig): SyntheticDataset {
  const config: Required<SyntheticConfig> = { ...DEFAULT_SYNTHETIC, ...input };
  const { nStreams, nTicks, nClusters, outlierStreams } = config;
  const rand = mulberry32(config.seed);

  const prototypes = Array.from({ length: nClusters }, () => prototype(rand, nTicks));
  const dimensions = Array.from({ length: nStreams }, (_, i) => streamName(i, nStreams));

  // Round-robin membership keeps clusters balanced; the last
  // `outlierStreams` streams are outliers.
  const nMembers = Math.max(0, nStreams - outlierStreams);
  const labels = dimensions.map((_, i) => (i < nMembers && nClusters > 0 ? i % nClusters : -1));

  const series = labels.map((label) => {
    const base = label >= 0 ? prototypes[label] : prototype(rand, nTicks);
    const scale = uniform(rand, config.scaleRange);
    const offset = uniform(rand, config.offsetRange);
    return base.map((v) => offset + scale * (v + config.noiseSigma * gaussian(rand)));
  });

  const rows: SyntheticRow[] = [];
  for (let t = 0; t < nTicks; t++) {
    const row = { timestamp: config.startTime + t * config.intervalMs } as SyntheticRow;
    for (let i = 0; i < nStreams; i++) {
      if (config.missingRate > 0 && rand() < config.missingRate) continue;
      row[dimensions[i]] = series[i][t];
    }
    rows.push(row);
  }

  return { config, dimensions, rows, truth: { labels } };
}

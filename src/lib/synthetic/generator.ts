/**
 * Seeded synthetic stream generator with known ground truth.
 *
 * Every stream follows one of `nClusters` independent prototype signals plus
 * its own white noise, under its own positive affine transform (level and
 * scale differ, the shape is shared). Outlier streams follow their own
 * private signal. Optionally, some streams switch to another cluster at a
 * known tick, and anomalies (spikes, drops, level shifts) are injected at
 * known ticks. The ground truth records all of it, so clustering can be
 * scored with the adjusted Rand index and a viewer's flags with
 * time-to-detect and hit/miss rates.
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
  /** Streams that switch to a different cluster once, at a random tick. */
  membershipSwitches?: number;
  /** Number of injected anomalies (spike, drop or level shift). */
  anomalies?: number;
  /** Anomaly size in units of the stream's own standard deviation. */
  anomalyMagnitude?: number;
  startTime?: number;
  intervalMs?: number;
};

export type SyntheticRow = { timestamp: number } & Record<string, number>;

export type MembershipSwitch = {
  stream: string;
  /** First tick at which the stream follows its new cluster. */
  atTick: number;
  atTime: number;
  from: number;
  to: number;
};

export type InjectedAnomaly = {
  stream: string;
  atTick: number;
  atTime: number;
  durationTicks: number;
  kind: "spike" | "drop" | "levelShift";
  /** Size in units of the stream's standard deviation (signed). */
  magnitude: number;
};

export type SyntheticDataset = {
  config: Required<SyntheticConfig>;
  dimensions: string[];
  rows: SyntheticRow[];
  truth: {
    /** Cluster of each stream at tick 0 (index-aligned), -1 = outlier. */
    labels: number[];
    switches: MembershipSwitch[];
    anomalies: InjectedAnomaly[];
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
  membershipSwitches: 0,
  anomalies: 0,
  anomalyMagnitude: 6,
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
  // Events come from their own stream of random numbers, so adding switches
  // or anomalies leaves the base signals of a seed unchanged.
  const eventRand = mulberry32(config.seed ^ 0x5bd1e995);

  const prototypes = Array.from({ length: nClusters }, () => prototype(rand, nTicks));
  const dimensions = Array.from({ length: nStreams }, (_, i) => streamName(i, nStreams));

  // Round-robin membership keeps clusters balanced; the last
  // `outlierStreams` streams are outliers.
  const nMembers = Math.max(0, nStreams - outlierStreams);
  const labels = dimensions.map((_, i) => (i < nMembers && nClusters > 0 ? i % nClusters : -1));

  // Membership switches: distinct member streams, each moving once to
  // another cluster somewhere in the middle 70% of the run.
  const switches: MembershipSwitch[] = [];
  if (nClusters > 1) {
    const candidates = labels.flatMap((label, i) => (label >= 0 ? [i] : []));
    for (let k = 0; k < Math.min(config.membershipSwitches, candidates.length); k++) {
      const pick = candidates.splice(Math.floor(eventRand() * candidates.length), 1)[0];
      const from = labels[pick];
      const to = (from + 1 + Math.floor(eventRand() * (nClusters - 1))) % nClusters;
      const atTick = Math.floor(nTicks * (0.2 + 0.7 * eventRand()));
      switches.push({
        stream: dimensions[pick],
        atTick,
        atTime: config.startTime + atTick * config.intervalMs,
        from,
        to,
      });
    }
  }
  const switchOf = new Map(switches.map((sw) => [sw.stream, sw]));

  const anomalies: InjectedAnomaly[] = [];
  const kinds: InjectedAnomaly["kind"][] = ["spike", "drop", "levelShift"];
  for (let k = 0; k < config.anomalies && nStreams > 0; k++) {
    const kind = kinds[Math.floor(eventRand() * kinds.length)];
    const atTick = Math.floor(nTicks * (0.1 + 0.85 * eventRand()));
    const durationTicks = kind === "levelShift" ? Math.max(1, Math.floor(nTicks * 0.05)) : 1 + Math.floor(eventRand() * 3);
    anomalies.push({
      stream: dimensions[Math.floor(eventRand() * nStreams)],
      atTick,
      atTime: config.startTime + atTick * config.intervalMs,
      durationTicks,
      kind,
      magnitude: (kind === "drop" ? -1 : 1) * config.anomalyMagnitude,
    });
  }
  anomalies.sort((a, b) => a.atTick - b.atTick);

  const series = labels.map((label, i) => {
    const own = label >= 0 ? null : prototype(rand, nTicks);
    const scale = uniform(rand, config.scaleRange);
    const offset = uniform(rand, config.offsetRange);
    const sw = switchOf.get(dimensions[i]);
    return Array.from({ length: nTicks }, (_, t) => {
      const base = own ? own[t] : prototypes[sw && t >= sw.atTick ? sw.to : label][t];
      return offset + scale * (base + config.noiseSigma * gaussian(rand));
    });
  });

  // Anomalies are added on top, in units of the stream's (unit-variance
  // prototype) scale, so their size is comparable across streams.
  for (const anomaly of anomalies) {
    const i = dimensions.indexOf(anomaly.stream);
    const std = streamStd(series[i]);
    for (let t = anomaly.atTick; t < Math.min(nTicks, anomaly.atTick + anomaly.durationTicks); t++) {
      series[i][t] += anomaly.magnitude * std;
    }
  }

  const rows: SyntheticRow[] = [];
  for (let t = 0; t < nTicks; t++) {
    const row = { timestamp: config.startTime + t * config.intervalMs } as SyntheticRow;
    for (let i = 0; i < nStreams; i++) {
      if (config.missingRate > 0 && rand() < config.missingRate) continue;
      row[dimensions[i]] = series[i][t];
    }
    rows.push(row);
  }

  return { config, dimensions, rows, truth: { labels, switches, anomalies } };
}

function streamStd(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

/**
 * Ground-truth labels for the window of `windowTicks` ticks ending at
 * `endTick` (inclusive). A stream that switched cluster inside the window has
 * no single true label: it is marked `ambiguous` and should be left out when
 * scoring.
 */
export function truthForWindow(
  ds: SyntheticDataset,
  endTick: number,
  windowTicks: number
): { labels: number[]; ambiguous: boolean[] } {
  const startTick = endTick - windowTicks + 1;
  const switchOf = new Map(ds.truth.switches.map((sw) => [sw.stream, sw]));
  const labels: number[] = [];
  const ambiguous: boolean[] = [];
  ds.dimensions.forEach((dim, i) => {
    const sw = switchOf.get(dim);
    labels.push(sw && endTick >= sw.atTick ? sw.to : ds.truth.labels[i]);
    ambiguous.push(!!sw && sw.atTick > startTick && sw.atTick <= endTick);
  });
  return { labels, ambiguous };
}

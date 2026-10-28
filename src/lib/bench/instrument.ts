/**
 * Lightweight runtime instrumentation for the live app.
 *
 * Records per-update timings into a bounded ring buffer so we can (a) drive
 * adaptive throttling from the *measured* compute cost (see
 * useViewModelStore), and (b) show them in the dev overlay and export them as
 * CSV for the end-to-end latency benchmark (bench/e2e.mjs). Dependency-free
 * and SSR-safe.
 *
 * One update = one run of the clustering pipeline:
 *   newest row arrives -> worker clustering (computeMs) -> view model set
 *   -> every chart that changed re-renders -> next painted frame.
 */

export type PerfSample = {
  /** Wall-clock time the sample was recorded (ms since epoch). */
  at: number;
  /** Update sequence number. */
  seq: number;
  nStreams: number;
  clusterCount: number;
  layout?: string;
  dataTicks?: number;
  eps?: number;
  minPts?: number;
  /** Clustering round trip to the worker, including WASM (ms). */
  computeMs: number;
  /** View-model update until all changed charts re-rendered and a frame was painted (ms). */
  renderMs?: number;
  /** Arrival of the newest row in this update until that frame was painted (ms). */
  latencyMs?: number;
};

const RING_CAPACITY = 2000;
const ring: PerfSample[] = [];

/** Append a sample, evicting the oldest once the ring is full. */
export function recordSample(sample: PerfSample): PerfSample {
  ring.push(sample);
  if (ring.length > RING_CAPACITY) ring.shift();
  return sample;
}

/** Snapshot of all retained samples (oldest first). */
export function getSamples(): PerfSample[] {
  return ring.slice();
}

export function clearSamples(): void {
  ring.length = 0;
}

/** Mean of the last `n` compute durations, or undefined if no samples yet. */
export function recentComputeMs(n = 5): number | undefined {
  if (ring.length === 0) return undefined;
  const slice = ring.slice(-n);
  return slice.reduce((sum, s) => sum + s.computeMs, 0) / slice.length;
}

/**
 * Measure an async unit of work with `performance.now()` and return both its
 * result and the elapsed milliseconds.
 */
export async function timed<T>(fn: () => Promise<T>): Promise<{
  result: T;
  ms: number;
}> {
  const t0 = performance.now();
  const result = await fn();
  return { result, ms: performance.now() - t0 };
}

// ---------------------------------------------------------------------------
// Render tracking: when has everything that changed been drawn?
// ---------------------------------------------------------------------------

let pendingRenders = 0;
let waiting: { committedAt: number; finish: (paintedAt: number, committedAt: number) => void } | null = null;

const afterTwoFrames = (fn: () => void) => {
  if (typeof requestAnimationFrame === "undefined") return void setTimeout(fn, 0);
  // The first callback runs before the next paint, the second after it.
  requestAnimationFrame(() => requestAnimationFrame(fn));
};

function maybeFinish() {
  if (!waiting || pendingRenders > 0) return;
  const current = waiting;
  waiting = null;
  afterTwoFrames(() => current.finish(performance.now(), current.committedAt));
}

/**
 * A chart starts re-rendering (called synchronously during React's commit).
 * Returns a function that marks it settled; calling it more than once is a
 * no-op, so it can also be used in effect cleanups.
 */
export function renderStarted(): () => void {
  pendingRenders++;
  let settled = false;
  return () => {
    if (settled) return;
    settled = true;
    pendingRenders = Math.max(0, pendingRenders - 1);
    maybeFinish();
  };
}

/**
 * Call right after the view model was updated. `finish` runs once every
 * chart that re-rendered for this update has settled and a frame has been
 * painted. A newer update supersedes one that has not finished yet.
 */
export function awaitPaint(finish: (paintedAt: number, committedAt: number) => void): void {
  waiting = { committedAt: performance.now(), finish };
  // React commits synchronously (external-store update); charts register
  // their renders during that commit, so check once the commit is done.
  setTimeout(maybeFinish, 0);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const CSV_COLUMNS: (keyof PerfSample)[] = [
  "at",
  "seq",
  "nStreams",
  "clusterCount",
  "layout",
  "dataTicks",
  "eps",
  "minPts",
  "computeMs",
  "renderMs",
  "latencyMs",
];

/** Serialize samples (default: the ring buffer) to CSV. */
export function samplesToCsv(samples: PerfSample[] = ring): string {
  const format = (v: unknown) =>
    v === undefined ? "" : typeof v === "number" && !Number.isInteger(v) ? v.toFixed(3) : String(v);
  return [
    CSV_COLUMNS.join(","),
    ...samples.map((s) => CSV_COLUMNS.map((c) => format(s[c])).join(",")),
  ].join("\n");
}

/** Nearest-rank percentile of a list of numbers (q in 0..1). */
export function percentile(values: number[], q: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}

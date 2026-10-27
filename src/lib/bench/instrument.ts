/**
 * Lightweight runtime instrumentation for the live app.
 *
 * Records per-tick compute/render timings into a bounded ring buffer so we can
 * (a) drive adaptive throttling from the *measured* compute cost (see
 * useViewModelStore), and (b) expose a dev overlay / export the samples as CSV
 * for the paper's end-to-end scalability numbers. Kept dependency-free and
 * SSR-safe (uses `performance.now()` only).
 */

export type PerfSample = {
  /** Wall-clock time the sample was recorded (ms since epoch). */
  at: number;
  nStreams: number;
  clusterCount: number;
  dataTicks?: number;
  eps?: number;
  minPts?: number;
  /** WASM clustering duration for this tick (ms). */
  computeMs: number;
  /** Time from compute-done to the next animation frame commit (ms). */
  renderMs?: number;
};

const RING_CAPACITY = 500;
const ring: PerfSample[] = [];

/** Append a sample, evicting the oldest once the ring is full. */
export function recordSample(sample: PerfSample): void {
  ring.push(sample);
  if (ring.length > RING_CAPACITY) ring.shift();
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

/**
 * Resolve on the next animation frame (after the browser has painted). Used to
 * approximate render latency: the gap between handing React new data and the
 * subsequent frame. No-ops to a microtask when rAF is unavailable (SSR/tests).
 */
export function nextFrame(): Promise<number> {
  if (typeof requestAnimationFrame === "undefined") {
    return Promise.resolve(performance.now());
  }
  return new Promise((resolve) =>
    requestAnimationFrame(() => resolve(performance.now()))
  );
}

/** Serialize the ring buffer to CSV (same column order as bench/sweep.mjs). */
export function samplesToCsv(): string {
  const cols = [
    "at",
    "nStreams",
    "clusterCount",
    "dataTicks",
    "eps",
    "minPts",
    "computeMs",
    "renderMs",
  ];
  const lines = [cols.join(",")];
  for (const s of ring) {
    lines.push(
      [
        s.at,
        s.nStreams,
        s.clusterCount,
        s.dataTicks ?? "",
        s.eps ?? "",
        s.minPts ?? "",
        s.computeMs.toFixed(4),
        s.renderMs?.toFixed(4) ?? "",
      ].join(",")
    );
  }
  return lines.join("\n");
}

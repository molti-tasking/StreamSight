/**
 * Adaptive throttle: like a trailing throttle, but the wait interval tracks the
 * *measured* cost of the work instead of being a fixed constant. Cheap workloads
 * refresh quickly; expensive ones (many streams / long windows) back off
 * automatically, keeping the UI responsive without a hand-tuned constant.
 *
 * `getCostMs` returns the recent cost of one run (e.g. clustering compute time
 * from the instrument ring buffer); the next interval is
 * `clamp(minMs, factor * costMs, maxMs)`.
 */
export function createAdaptiveThrottle(
  fn: () => void | Promise<void>,
  {
    getCostMs,
    minMs = 500,
    maxMs = 5000,
    factor = 3,
  }: {
    getCostMs: () => number | undefined;
    minMs?: number;
    maxMs?: number;
    factor?: number;
  }
): () => void {
  let lastRun = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const interval = () => {
    const cost = getCostMs() ?? minMs;
    return Math.min(maxMs, Math.max(minMs, cost * factor));
  };

  const run = async () => {
    if (running) return; // never overlap runs
    running = true;
    lastRun = Date.now();
    try {
      await fn();
    } finally {
      running = false;
    }
  };

  return () => {
    if (timer) return; // a trailing run is already scheduled
    const elapsed = Date.now() - lastRun;
    const wait = interval();
    if (elapsed >= wait && !running) {
      void run();
    } else {
      timer = setTimeout(
        () => {
          timer = null;
          void run();
        },
        Math.max(0, wait - elapsed)
      );
    }
  };
}

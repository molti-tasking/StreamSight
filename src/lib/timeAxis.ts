/**
 * Time-axis formatting shared by every chart, so all x axes carry a unit.
 *
 * "relative" sources (recordings, synthetic streams) have timestamps in ms
 * since the start and are shown as elapsed time on a UTC scale (so 0 ms is
 * 00:00, independent of the viewer's time zone). "absolute" sources are wall
 * clock or calendar times; the format follows the visible span.
 */
export type TimeAxisKind = "relative" | "absolute";

export type TimeAxisFormat = {
  /** d3 time format specifier. */
  format: string;
  /** Interpret timestamps as UTC (relative time) or local time. */
  utc: boolean;
  title: string;
  /** Smallest tick step in ms (avoids sub-second ticks such as ".500"). */
  tickMinStep?: number;
};

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export function timeAxisFormat(kind: TimeAxisKind, spanMs: number): TimeAxisFormat {
  if (kind === "relative") {
    return spanMs < HOUR
      ? { format: "%M:%S", utc: true, title: "Elapsed (mm:ss)", tickMinStep: 1000 }
      : { format: "%H:%M:%S", utc: true, title: "Elapsed (hh:mm:ss)", tickMinStep: 1000 };
  }
  if (spanMs >= 2 * DAY) return { format: "%Y-%m-%d", utc: false, title: "Date (yyyy-mm-dd)" };
  if (spanMs >= HOUR) return { format: "%H:%M", utc: false, title: "Time (hh:mm)", tickMinStep: 60 * 1000 };
  return { format: "%H:%M:%S", utc: false, title: "Time (hh:mm:ss)", tickMinStep: 1000 };
}

/** Earliest and latest timestamp across clusters of rows ([0, 1] if none). */
export function timeDomain(clusters: { timestamp?: number }[][]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const rows of clusters) {
    for (const row of rows) {
      const t = row.timestamp;
      if (t === undefined || !Number.isFinite(t)) continue;
      if (t < min) min = t;
      if (t > max) max = t;
    }
  }
  return min <= max ? [min, max] : [0, 1];
}

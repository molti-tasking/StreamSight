/**
 * Scores a participant's "flag event" presses against ground-truth event
 * times (e.g. the synthetic generator's injected anomalies and membership
 * switches). Times are data times (ms on the stream's own clock), so scores
 * do not depend on the playback speed.
 *
 * Each event is detected by the earliest unmatched flag in
 * [event time, event time + toleranceMs]; each flag counts for at most one
 * event. Flags that match no event are false alarms.
 */
export type TruthEvent = { atTime: number; kind: string; stream?: string };
export type Flag = { dataTime: number };

export type FlagScore = {
  events: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  hitRate: number;
  /** Data-time delay from each detected event to its flag (ms), in event order. */
  timesToDetect: number[];
  medianTimeToDetect?: number;
  perEvent: (TruthEvent & { detectedAt?: number })[];
};

export function scoreFlags(events: TruthEvent[], flags: Flag[], toleranceMs: number): FlagScore {
  const sortedEvents = [...events].sort((a, b) => a.atTime - b.atTime);
  const sortedFlags = [...flags].sort((a, b) => a.dataTime - b.dataTime);
  const used = new Set<number>();
  const perEvent = sortedEvents.map((event): TruthEvent & { detectedAt?: number } => {
    const index = sortedFlags.findIndex(
      (flag, i) => !used.has(i) && flag.dataTime >= event.atTime && flag.dataTime <= event.atTime + toleranceMs
    );
    if (index < 0) return { ...event };
    used.add(index);
    return { ...event, detectedAt: sortedFlags[index].dataTime };
  });
  const timesToDetect = perEvent.flatMap((e) => (e.detectedAt === undefined ? [] : [e.detectedAt - e.atTime]));
  const sorted = [...timesToDetect].sort((a, b) => a - b);
  const hits = timesToDetect.length;
  return {
    events: events.length,
    hits,
    misses: events.length - hits,
    falseAlarms: flags.length - used.size,
    hitRate: events.length ? hits / events.length : 0,
    timesToDetect,
    medianTimeToDetect: sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : undefined,
    perEvent,
  };
}

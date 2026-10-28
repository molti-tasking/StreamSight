import { create } from "zustand";
import { DataSet, dataSets, fetchDataSet } from "@/data/streamDataSet";
import {
  generateSynthetic,
  SyntheticConfig,
  SyntheticDataset,
} from "@/lib/synthetic/generator";
import { useRawDataStore } from "./useRawDataStore";

export type PlaybackSpeed = "native" | 2 | 10 | "max";

export const playbackSpeeds: PlaybackSpeed[] = ["native", 2, 10, "max"];

export type PlaybackSource =
  | { kind: "dataset"; dataSet: DataSet }
  | { kind: "synthetic"; config: SyntheticConfig };

export type ReferenceEvent = { code: string; onsetMs: number; durationMs: number };

type Row = Record<string, number>;

interface PlaybackStore {
  source?: PlaybackSource;
  status: "idle" | "loading" | "playing" | "paused" | "ended";
  speed: PlaybackSpeed;
  /** Number of rows emitted so far (index of the next row). */
  position: number;
  total: number;
  /** Time between rows at native speed, in ms. */
  intervalMs: number;
  /** Ground truth of a synthetic source (cluster labels, switches, anomalies). */
  truth?: SyntheticDataset["truth"];
  /** Reference events recorded with a dataset (e.g. NIRS stimulus markers). */
  events?: ReferenceEvent[];
  error?: string;

  load: (source: PlaybackSource, options?: { autoplay?: boolean }) => Promise<void>;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Pauses and emits exactly one row. */
  step: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  /** Pauses and shows the source up to row `position` (for shared views). */
  seek: (position: number) => void;
}

// The full source lives outside React state; only the emitted rows go into
// the raw-data store.
let rows: Row[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let loadToken = 0;

const stopTimer = () => {
  if (timer !== null) clearTimeout(timer);
  timer = null;
};

/** Delay between rows for a speed: native interval / factor; max = no delay. */
export const rowDelayMs = (speed: PlaybackSpeed, intervalMs: number) =>
  speed === "max" ? 0 : intervalMs / (speed === "native" ? 1 : speed);

/** "max" fast-forwards: this many rows per ~frame. */
export const MAX_ROWS_PER_FRAME = 50;
const FRAME_MS = 16;
/** Upper bound on rows appended at once when catching up after a stall. */
export const MAX_CATCH_UP = 1000;

/**
 * Rows that have fallen due on a clock started at `clockStart` that has
 * already delivered `delivered` rows, one row every `delayMs`.
 */
export const rowsDue = (now: number, clockStart: number, delivered: number, delayMs: number) =>
  Math.floor((now - clockStart) / delayMs) - delivered;

export const usePlaybackStore = create<PlaybackStore>((set, get) => {
  /** Appends up to `count` rows; returns false once the source is exhausted. */
  const emit = (count = 1): boolean => {
    const { position, total } = get();
    if (position >= total) {
      stopTimer();
      set({ status: "ended" });
      return false;
    }
    const end = Math.min(total, position + Math.max(1, count));
    useRawDataStore.getState().append(rows.slice(position, end));
    set({ position: end });
    if (end >= total) {
      stopTimer();
      set({ status: "ended" });
      return false;
    }
    return true;
  };

  // Playback is a clock: rows are due at `clockStart + k * delay`. Each timer
  // fire appends every row that is due, so the data rate stays exact even
  // when rendering is slower than the stream (rows then arrive in batches,
  // as they would from a real source).
  let clockStart = 0;
  let clockRows = 0;
  const startClock = () => {
    clockStart = performance.now();
    clockRows = 0;
  };
  const schedule = () => {
    stopTimer();
    const delay = rowDelayMs(get().speed, get().intervalMs);
    const wait =
      delay === 0 ? FRAME_MS : Math.max(0, clockStart + (clockRows + 1) * delay - performance.now());
    timer = setTimeout(() => {
      timer = null;
      if (get().status !== "playing") return;
      let due: number;
      if (delay === 0) {
        due = MAX_ROWS_PER_FRAME;
      } else {
        due = rowsDue(performance.now(), clockStart, clockRows, delay);
        if (due > MAX_CATCH_UP) {
          // A long stall (e.g. a background tab): skip ahead, not burst.
          startClock();
          due = 1;
        }
      }
      clockRows += Math.max(1, due);
      if (emit(due)) schedule();
    }, wait);
  };

  return {
    status: "idle",
    speed: "native",
    position: 0,
    total: 0,
    intervalMs: 1000,

    load: async (source, { autoplay = true } = {}) => {
      stopTimer();
      const token = ++loadToken;
      rows = [];
      set({ source, status: "loading", position: 0, total: 0, truth: undefined, events: undefined, error: undefined });
      useRawDataStore.getState().reset([]);
      try {
        let dimensions: string[];
        let intervalMs: number;
        let truth: SyntheticDataset["truth"] | undefined;
        let events: ReferenceEvent[] | undefined;
        if (source.kind === "synthetic") {
          const ds = generateSynthetic(source.config);
          rows = ds.rows;
          dimensions = ds.dimensions;
          intervalMs = ds.config.intervalMs;
          truth = ds.truth;
        } else {
          const info = dataSets[source.dataSet];
          const [data, meta] = await Promise.all([
            fetchDataSet(source.dataSet),
            info.metaUrl ? fetch(info.metaUrl).then((r) => r.json()) : undefined,
          ]);
          if (token !== loadToken) return; // superseded by a newer load
          rows = data as Row[];
          dimensions = rows.length
            ? Object.keys(rows[0]).filter((key) => key !== "timestamp")
            : [];
          intervalMs = info.playbackIntervalMs;
          events = meta?.events;
        }
        useRawDataStore.getState().reset(dimensions);
        set({ total: rows.length, intervalMs, truth, events, status: "paused" });
        if (autoplay) get().play();
      } catch (error) {
        if (token !== loadToken) return;
        set({ status: "idle", error: error instanceof Error ? error.message : String(error) });
      }
    },

    play: () => {
      const { status, position, total } = get();
      if (status === "loading" || status === "playing" || total === 0) return;
      if (position >= total) return set({ status: "ended" });
      set({ status: "playing" });
      startClock();
      if (emit()) schedule();
    },

    pause: () => {
      stopTimer();
      if (get().status === "playing") set({ status: "paused" });
    },

    toggle: () => (get().status === "playing" ? get().pause() : get().play()),

    step: () => {
      if (get().status === "loading" || get().total === 0) return;
      get().pause();
      emit();
    },

    seek: (position) => {
      get().pause();
      const end = Math.max(0, Math.min(get().total, Math.round(position)));
      useRawDataStore.getState().reset(useRawDataStore.getState().dimensions);
      if (end > 0) useRawDataStore.getState().append(rows.slice(0, end));
      set({ position: end, status: end >= get().total && end > 0 ? "ended" : "paused" });
    },

    setSpeed: (speed) => {
      set({ speed });
      if (get().status === "playing") {
        startClock();
        schedule();
      }
    },
  };
});

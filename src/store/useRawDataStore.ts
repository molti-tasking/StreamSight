import { create } from "zustand";

/**
 * Upper bound on retained stream rows. Streaming appends a row every tick, so an
 * unbounded array means O(n) copies and ever-growing memory/cluster cost. This
 * cap keeps per-tick work flat while still leaving plenty of history for the
 * cluster-over-time view (which walks the full retained window).
 */
const MAX_RETAINED_ROWS = 2000;

const capRows = <T>(rows: T[]): T[] =>
  rows.length > MAX_RETAINED_ROWS ? rows.slice(-MAX_RETAINED_ROWS) : rows;

/**
 * The rows the app has received so far (the "live" buffer). Rows are fed in
 * by the playback controller (`usePlaybackStore`).
 */
interface DataStore {
  dimensions: string[];
  values: Record<string, number>[];

  /** Clears the buffer for a new source with the given streams. */
  reset: (dimensions: string[]) => void;
  /** Appends rows in arrival order. */
  append: (rows: Record<string, number>[]) => void;
}

export const useRawDataStore = create<DataStore>((set) => ({
  dimensions: [],
  values: [],

  reset: (dimensions) => set({ dimensions, values: [] }),
  append: (rows) =>
    set((state) => ({ values: capRows([...state.values, ...rows]) })),
}));

import { create } from "zustand";

/**
 * Manual / static cluster assignment.
 *
 * Adaptive (DBSCAN) clustering is great for exploratory pattern discovery, but
 * operational monitoring often needs *stable, domain-defined* groups (e.g. the
 * anatomical sensor regions in the cardiovascular case study, where the expert
 * explicitly wanted to "choose one [grouping] and stick to it"). This store
 * lets the user override the automatic assignment:
 *
 * - `pins`: per-stream overrides (dimension -> stable cluster id) that win over
 *   the automatic clustering every tick.
 * - `locked`: freeze the *entire* current assignment so clusters stop changing.
 *   `lockCurrent` snapshots the live assignment into `pins`; `unlock` clears it.
 */
interface ManualAssignmentStore {
  pins: Record<string, number>;
  locked: boolean;
  pin: (dimension: string, clusterId: number) => void;
  unpin: (dimension: string) => void;
  clear: () => void;
  lockCurrent: (assignment: [string, number][]) => void;
  unlock: () => void;
}

export const useManualAssignmentStore = create<ManualAssignmentStore>((set) => ({
  pins: {},
  locked: false,
  pin: (dimension, clusterId) =>
    set((state) => ({ pins: { ...state.pins, [dimension]: clusterId } })),
  unpin: (dimension) =>
    set((state) => {
      const next = { ...state.pins };
      delete next[dimension];
      return { pins: next };
    }),
  clear: () => set({ pins: {}, locked: false }),
  lockCurrent: (assignment) =>
    set({
      locked: true,
      pins: Object.fromEntries(
        assignment.filter(([, clusterId]) => clusterId >= 0)
      ),
    }),
  unlock: () => set({ pins: {}, locked: false }),
}));

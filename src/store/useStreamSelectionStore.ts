import { create } from "zustand";

/**
 * Streams the user is looking at, shared by the cluster-assignment bar and
 * every chart (linked highlighting in both directions):
 * - `hovered`: the stream under the pointer in the bar or in a chart;
 * - `pinned`: streams kept highlighted by a click, until clicked again.
 * `values` (pinned plus hovered) is what the charts draw in black.
 */
type StreamSelectionStore = {
  hovered?: string;
  pinned: string[];
  values: string[];
  setHovered: (stream?: string) => void;
  togglePinned: (stream: string) => void;
  clearPinned: () => void;
};

const combine = (pinned: string[], hovered?: string) =>
  hovered && !pinned.includes(hovered) ? [...pinned, hovered] : pinned;

export const useStreamSelectionStore = create<StreamSelectionStore>((set, get) => ({
  hovered: undefined,
  pinned: [],
  values: [],
  setHovered: (hovered) => {
    if (get().hovered === hovered) return;
    set({ hovered, values: combine(get().pinned, hovered) });
  },
  togglePinned: (stream) => {
    const { pinned, hovered } = get();
    const next = pinned.includes(stream) ? pinned.filter((s) => s !== stream) : [...pinned, stream];
    set({ pinned: next, values: combine(next, hovered) });
  },
  clearPinned: () => set({ pinned: [], values: combine([], get().hovered) }),
}));

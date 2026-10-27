import { create } from "zustand";

export type Bookmark = {
  id: string;
  label: string;
  from: number;
  to: number;
};

/**
 * Multi-scale temporal navigation.
 *
 * The detail views normally show the most recent `dataTicks` window ("latest").
 * This store lets the user instead pin an explicit time range ("range"), e.g. by
 * brushing the timeline overview, and bookmark ranges to jump back to them — the
 * external-memory aid the formative study asked for ("if something happened an
 * hour ago, we forget it").
 */
interface TemporalNavigationStore {
  mode: "latest" | "range";
  from?: number;
  to?: number;
  bookmarks: Bookmark[];

  setRange: (from: number, to: number) => void;
  setLatest: () => void;
  addBookmark: (label?: string) => void;
  removeBookmark: (id: string) => void;
  jumpTo: (id: string) => void;
}

// Math.random()/Date.now() are fine in the live app; ids only need to be unique
// within a session.
let bookmarkSeq = 0;

export const useTemporalNavigationStore = create<TemporalNavigationStore>(
  (set, get) => ({
    mode: "latest",
    from: undefined,
    to: undefined,
    bookmarks: [],

    setRange: (from, to) => set({ mode: "range", from, to }),
    setLatest: () => set({ mode: "latest", from: undefined, to: undefined }),

    addBookmark: (label) => {
      const { from, to, bookmarks } = get();
      if (from === undefined || to === undefined) return;
      bookmarkSeq += 1;
      const id = `bm-${bookmarkSeq}`;
      set({
        bookmarks: [
          ...bookmarks,
          { id, label: label ?? `Bookmark ${bookmarkSeq}`, from, to },
        ],
      });
    },

    removeBookmark: (id) =>
      set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== id),
      })),

    jumpTo: (id) => {
      const bm = get().bookmarks.find((b) => b.id === id);
      if (bm) set({ mode: "range", from: bm.from, to: bm.to });
    },
  })
);

import type { PlaybackSource, PlaybackSpeed } from "@/store/usePlaybackStore";

/**
 * Everything needed to reproduce a view (e.g. a paper figure): the source
 * (dataset, or synthetic config incl. seed), playback position and speed,
 * all processing and view settings, and the selected time range.
 */
export type ViewState = {
  source: PlaybackSource;
  position: number;
  speed: PlaybackSpeed;
  processing: Record<string, unknown>;
  view: Record<string, unknown>;
  range?: { from: number; to: number };
};

const PARAM = "view";

/** Drops functions (store actions) from a store snapshot. */
export const plain = (state: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== "function"));

export function encodeViewState(state: ViewState): string {
  return `${PARAM}=${encodeURIComponent(JSON.stringify({ v: 1, ...state }))}`;
}

/** Reads the view state from a query string; undefined if absent or invalid. */
export function decodeViewState(search: string): ViewState | undefined {
  const raw = new URLSearchParams(search).get(PARAM);
  if (!raw) return undefined;
  try {
    const { v, ...state } = JSON.parse(raw);
    if (v !== 1 || !state.source || typeof state.position !== "number") return undefined;
    return state as ViewState;
  } catch {
    return undefined;
  }
}

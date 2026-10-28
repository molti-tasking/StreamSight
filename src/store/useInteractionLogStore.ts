import { create } from "zustand";

export type InteractionEvent = {
  /** ms since the session started (monotonic clock). */
  t: number;
  /** Wall-clock time, ISO 8601. */
  at: string;
  type: string;
  detail?: Record<string, unknown>;
};

type InteractionLogStore = {
  sessionId: string;
  startedAt: string;
  events: InteractionEvent[];
  log: (type: string, detail?: Record<string, unknown>) => void;
  /** Session as a JSON document (also what is downloaded). */
  toJson: (extra?: Record<string, unknown>) => string;
  reset: () => void;
};

const STORAGE_PREFIX = "streamsight.session.";
let origin = typeof performance !== "undefined" ? performance.now() : 0;

const newSession = () => ({
  sessionId: `s-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  startedAt: new Date().toISOString(),
  events: [] as InteractionEvent[],
});

// Autosave a copy on this device only (localStorage), at most once a second.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const autosave = (get: () => InteractionLogStore) => {
  if (typeof window === "undefined" || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_PREFIX + get().sessionId, get().toJson());
    } catch {
      // storage full or unavailable: the in-memory log and download still work
    }
  }, 1000);
};

/**
 * Timestamped interaction log for user studies. Never sent anywhere: it lives
 * in memory, is autosaved to localStorage, and is exported as one JSON file
 * per session.
 */
export const useInteractionLogStore = create<InteractionLogStore>((set, get) => ({
  ...newSession(),
  log: (type, detail) => {
    const event: InteractionEvent = {
      t: Math.round(performance.now() - origin),
      at: new Date().toISOString(),
      type,
      ...(detail ? { detail } : {}),
    };
    set((state) => ({ events: [...state.events, event] }));
    autosave(get);
  },
  toJson: (extra) =>
    JSON.stringify(
      {
        format: "streamsight-session/1",
        sessionId: get().sessionId,
        startedAt: get().startedAt,
        ...extra,
        events: get().events,
      },
      null,
      2
    ),
  reset: () => {
    origin = performance.now();
    set(newSession());
  },
}));

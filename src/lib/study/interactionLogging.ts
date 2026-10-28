import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useInteractionLogStore } from "@/store/useInteractionLogStore";
import { useManualAssignmentStore } from "@/store/useManualAssignmentStore";
import { usePlaybackStore } from "@/store/usePlaybackStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useStreamSelectionStore } from "@/store/useStreamSelectionStore";
import { useTemporalNavigationStore } from "@/store/useTemporalNavigationStore";

/** Changed top-level fields (functions excluded) between two store states. */
function changes(next: object, prev: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (typeof value === "function") continue;
    if (JSON.stringify(value) !== JSON.stringify((prev as Record<string, unknown>)[key])) out[key] = value;
  }
  return out;
}

/** Data time (timestamp of the newest row on screen) and playback position. */
export function streamPosition() {
  const values = useRawDataStore.getState().values;
  return {
    dataTime: values[values.length - 1]?.timestamp,
    row: usePlaybackStore.getState().position,
  };
}

const HOVER_MIN_MS = 300;

/**
 * Subscribes the interaction log to the app's stores: settings and layout
 * changes, hovers (held at least 300 ms) and pins, manual assignments,
 * temporal navigation and playback. Returns an unsubscribe function.
 */
export function startInteractionLogging(): () => void {
  const log = useInteractionLogStore.getState().log;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  // The source may have been chosen before this page mounted.
  log("session-start", {
    source: usePlaybackStore.getState().source,
    speed: usePlaybackStore.getState().speed,
    ...streamPosition(),
  });

  const unsubscribers = [
    useClusterProcessingSettingsStore.subscribe((next, prev) => {
      const changed = changes(next, prev);
      if (Object.keys(changed).length) log("settings", { changed, ...streamPosition() });
    }),
    useStreamClustersSettingsStore.subscribe((next, prev) => {
      const changed = changes(next, prev);
      if (!Object.keys(changed).length) return;
      if ("layoutMode" in changed) log("layout", { from: prev.layoutMode, to: next.layoutMode, ...streamPosition() });
      const rest = Object.fromEntries(Object.entries(changed).filter(([key]) => key !== "layoutMode"));
      if (Object.keys(rest).length) log("view-settings", { changed: rest, ...streamPosition() });
    }),
    useStreamSelectionStore.subscribe((next, prev) => {
      if (next.hovered !== prev.hovered) {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = null;
        const stream = next.hovered;
        if (stream) {
          hoverTimer = setTimeout(() => log("hover", { stream, ...streamPosition() }), HOVER_MIN_MS);
        }
      }
      for (const stream of next.pinned) if (!prev.pinned.includes(stream)) log("pin", { stream, ...streamPosition() });
      for (const stream of prev.pinned) if (!next.pinned.includes(stream)) log("unpin", { stream, ...streamPosition() });
    }),
    useManualAssignmentStore.subscribe((next, prev) => {
      const changed = changes(next, prev);
      if (Object.keys(changed).length) log("manual-assignment", { changed, ...streamPosition() });
    }),
    useTemporalNavigationStore.subscribe((next, prev) => {
      const changed = changes(next, prev);
      if (Object.keys(changed).length) log("navigation", { changed });
    }),
    usePlaybackStore.subscribe((next, prev) => {
      if (next.source !== prev.source && next.source) log("load", { source: next.source });
      if (next.status !== prev.status) log("playback", { status: next.status, ...streamPosition() });
      if (next.speed !== prev.speed) log("playback-speed", { speed: next.speed, ...streamPosition() });
    }),
  ];
  return () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

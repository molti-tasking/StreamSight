"use client";
import { decodeViewState, encodeViewState, plain } from "@/lib/urlState";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { usePlaybackStore } from "@/store/usePlaybackStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useTemporalNavigationStore } from "@/store/useTemporalNavigationStore";
import { useEffect } from "react";

/**
 * Keeps the URL in sync with the view (source, seed, playback position and
 * speed, all settings, selected time range), so a URL reproduces a view, and
 * restores such a view when the page is opened with `?view=...`.
 */
export const UrlStateSync = () => {
  useEffect(() => {
    let cancelled = false;
    const restored = decodeViewState(window.location.search);
    const restore = async () => {
      if (!restored) return;
      useClusterProcessingSettingsStore.getState().updateSettings((s) => ({ ...s, ...restored.processing }));
      useStreamClustersSettingsStore.getState().updateSettings((s) => ({ ...s, ...restored.view }));
      await usePlaybackStore.getState().load(restored.source, { autoplay: false });
      if (cancelled) return;
      usePlaybackStore.getState().setSpeed(restored.speed);
      usePlaybackStore.getState().seek(restored.position);
      if (restored.range) useTemporalNavigationStore.getState().setRange(restored.range.from, restored.range.to);
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const write = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const { source, position, speed } = usePlaybackStore.getState();
        if (!source) return;
        const nav = useTemporalNavigationStore.getState();
        const query = encodeViewState({
          source,
          position,
          speed,
          processing: plain(useClusterProcessingSettingsStore.getState()),
          view: plain(useStreamClustersSettingsStore.getState()),
          ...(nav.mode === "range" && nav.from !== undefined && nav.to !== undefined
            ? { range: { from: nav.from, to: nav.to } }
            : {}),
        });
        // Keep other flags (study=1, perf=1, bench=1) next to the view.
        const others = new URLSearchParams(window.location.search);
        others.delete("view");
        const prefix = others.toString() ? `${others.toString()}&` : "";
        window.history.replaceState(window.history.state, "", `${window.location.pathname}?${prefix}${query}`);
      }, 1000);
    };

    void restore();
    const unsubscribers = [
      usePlaybackStore.subscribe(write),
      useClusterProcessingSettingsStore.subscribe(write),
      useStreamClustersSettingsStore.subscribe(write),
      useTemporalNavigationStore.subscribe(write),
    ];
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribers.forEach((u) => u());
    };
  }, []);
  return null;
};

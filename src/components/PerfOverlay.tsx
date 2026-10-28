"use client";
import {
  clearSamples,
  getSamples,
  percentile,
  PerfSample,
  samplesToCsv,
} from "@/lib/bench/instrument";
import type { StreamClustersSettings } from "@/lib/settings/StreamClustersSettings";
import { usePlaybackStore } from "@/store/usePlaybackStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type BenchConfig = {
  nStreams?: number;
  nClusters?: number;
  rowsPerSecond?: number;
  layout?: StreamClustersSettings["layoutMode"];
  seed?: number;
  /** How long the source must be able to play, in seconds. */
  durationSec?: number;
};

declare global {
  interface Window {
    __streamsightBench?: {
      configure: (config: BenchConfig) => Promise<void>;
      getSamples: () => PerfSample[];
      clear: () => void;
    };
  }
}

/** Hooks for bench/e2e.mjs, installed only with `?bench=1`. */
function installBenchHooks() {
  window.__streamsightBench = {
    configure: async ({
      nStreams = 100,
      nClusters = 5,
      rowsPerSecond = 1,
      layout = "grid",
      seed = 1,
      durationSec = 120,
    }) => {
      useStreamClustersSettingsStore
        .getState()
        .updateSettings((s) => ({ ...s, layoutMode: layout }));
      await usePlaybackStore.getState().load({
        kind: "synthetic",
        config: {
          seed,
          nStreams,
          nClusters,
          nTicks: Math.ceil(durationSec * rowsPerSecond) + 200,
          intervalMs: 1000 / rowsPerSecond,
          membershipSwitches: Math.round(nStreams / 10),
          anomalies: 10,
        },
      });
      clearSamples();
    },
    getSamples,
    clear: clearSamples,
  };
}

const stat = (samples: PerfSample[], key: "computeMs" | "renderMs" | "latencyMs") => {
  const values = samples.map((s) => s[key]).filter((v): v is number => v !== undefined);
  const p50 = percentile(values, 0.5);
  const p95 = percentile(values, 0.95);
  return p50 === undefined ? "–" : `${p50.toFixed(0)} / ${p95!.toFixed(0)}`;
};

/**
 * Developer overlay with end-to-end timings of the last updates. Toggle with
 * Shift+P, or open the page with `?perf=1`.
 */
export const PerfOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [samples, setSamples] = useState<PerfSample[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("bench") === "1") installBenchHooks();
    // Applied after hydration (the page is prerendered without it).
    if (params.get("perf") === "1") queueMicrotask(() => setVisible(true));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === "p" && !(event.target instanceof HTMLInputElement)) {
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setSamples(getSamples().slice(-200)), 1000);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const download = () => {
    const blob = new Blob([samplesToCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `streamsight-perf-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const last = samples.at(-1);
  return (
    <div
      className="fixed bottom-2 right-2 z-50 rounded-md border bg-white/95 p-3 text-xs shadow-lg tabular-nums"
      role="region"
      aria-label="Performance overlay"
    >
      <div className="mb-1 font-semibold">Performance (last {samples.length} updates)</div>
      <table>
        <tbody>
          <tr><td className="pr-3">compute p50 / p95</td><td>{stat(samples, "computeMs")} ms</td></tr>
          <tr><td className="pr-3">render p50 / p95</td><td>{stat(samples, "renderMs")} ms</td></tr>
          <tr><td className="pr-3">row → paint p50 / p95</td><td>{stat(samples, "latencyMs")} ms</td></tr>
          <tr><td className="pr-3">streams / clusters</td><td>{last ? `${last.nStreams} / ${last.clusterCount}` : "–"}</td></tr>
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="outline" onClick={download}>CSV</Button>
        <Button size="sm" variant="outline" onClick={() => { clearSamples(); setSamples([]); }}>Clear</Button>
        <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>Close</Button>
      </div>
    </div>
  );
};

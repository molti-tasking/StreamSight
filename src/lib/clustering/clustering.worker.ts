/// <reference lib="webworker" />
import * as Comlink from "comlink";
import init, {
  aggregator as wasmAggregator,
} from "../../../backend/rust_wasm_module/pkg/rust_wasm_module.js";
import {
  AggregatedProps,
  ClusterRow,
  ClusterView,
  ClusteringSettings,
  sanitizeRows,
} from "./clusterTypes";
import { DEFAULT_DATA_TICKS, selectWindow } from "./clusteringSettings";

// Resolve the emitted `.wasm` asset to an absolute URL. wasm-bindgen's default
// `init()` builds a root-relative path (`/_next/static/media/...wasm`) which
// `fetch()` cannot parse against a worker's base; letting webpack rewrite our
// own `new URL(..., import.meta.url)` yields an absolute href that always loads.
const wasmUrl = new URL(
  "../../../backend/rust_wasm_module/pkg/rust_wasm_module_bg.wasm",
  import.meta.url
).href;

// Initialize the WASM module once, lazily, and reuse the promise for every call.
let wasmReady: Promise<unknown> | null = null;
const ensureReady = () => {
  if (!wasmReady) wasmReady = init({ module_or_path: wasmUrl });
  return wasmReady;
};

const clusteringApi = {
  /**
   * Cluster the most recent window of the stream. Replaces the former
   * `aggregator` server action — runs entirely in this worker via WASM, so no
   * per-tick network round-trip and no main-thread jank.
   */
  async aggregator(
    rawData: ClusterRow[],
    dimensions: string[],
    settings: ClusteringSettings
  ): Promise<AggregatedProps> {
    await ensureReady();
    // Only the window is sent into WASM; Rust re-applies the same selection.
    const clean = sanitizeRows(selectWindow(rawData, settings));
    return wasmAggregator(clean, dimensions, {
      eps: settings.eps,
      dataTicks: settings.dataTicks,
      minPts: settings.minPts,
      zNormalize: settings.zNormalize,
      timeScale: settings.timeScale,
    }) as AggregatedProps;
  },

  /**
   * Cluster assignment for every timestamp, each computed on the trailing
   * `dataTicks` rows ending at that timestamp, with the same eps / minPts /
   * z-normalization as the live view.
   */
  async clusteringOverTime(
    rawData: ClusterRow[],
    dimensions: string[],
    settings: Omit<ClusteringSettings, "timeScale">
  ): Promise<{ clustersInTime: ClusterView[] }> {
    await ensureReady();
    const clean = sanitizeRows(rawData);
    const contextWindow = settings.dataTicks || DEFAULT_DATA_TICKS;
    const clustersInTime: ClusterView[] = [];

    for (let i = 0; i < clean.length; i++) {
      const endIndex = i + 1;
      const startIndex = endIndex - contextWindow;
      if (startIndex < 0) continue;

      const window = clean.slice(startIndex, endIndex);
      const timestamp =
        "timestamp" in clean[i] ? String(clean[i].timestamp) : "";

      const { clusterAssignment } = wasmAggregator(window, dimensions, {
        eps: settings.eps,
        dataTicks: window.length,
        minPts: settings.minPts,
        zNormalize: settings.zNormalize,
      }) as AggregatedProps;

      clustersInTime.push({ timestamp, clusters: clusterAssignment });
    }

    return { clustersInTime };
  },
};

export type ClusteringApi = typeof clusteringApi;

Comlink.expose(clusteringApi);

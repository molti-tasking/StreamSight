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

// Initialize the WASM module once, lazily, and reuse the promise for every call.
let wasmReady: Promise<unknown> | null = null;
const ensureReady = () => {
  if (!wasmReady) wasmReady = init();
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
    const clean = sanitizeRows(rawData);
    return wasmAggregator(clean, dimensions, {
      eps: settings.eps,
      dataTicks: settings.dataTicks,
    }) as AggregatedProps;
  },

  /**
   * Cluster assignment over a sliding window for every timestamp. Port of the
   * former `clusteringOverTime` server action; calls the WASM clustering per
   * window (with `dataTicks` set to the window length so it is not re-sliced).
   */
  async clusteringOverTime(
    rawData: ClusterRow[],
    dimensions: string[],
    settings: ClusteringSettings
  ): Promise<{ clustersInTime: ClusterView[] }> {
    await ensureReady();
    const clean = sanitizeRows(rawData);
    const contextWindow = settings.dataTicks || 20;
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
      }) as AggregatedProps;

      clustersInTime.push({ timestamp, clusters: clusterAssignment });
    }

    return { clustersInTime };
  },
};

export type ClusteringApi = typeof clusteringApi;

Comlink.expose(clusteringApi);

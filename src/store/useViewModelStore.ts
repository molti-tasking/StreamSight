import _ from "lodash";
import { create } from "zustand";
import { useClusterProcessingSettingsStore } from "./ClusterProcessingSettingsStore";
import { useRawDataStore } from "./useRawDataStore";
import { useStreamClustersSettingsStore } from "./useStreamClustersSettingsStore";
import { highlighter } from "@/lib/clustering/highlighting";
import { updateClusterColorSlots } from "@/components/clusterColors";
import {
  getClusteringClient,
  getOverTimeClusteringClient,
} from "@/lib/clustering/clusteringClient";
import {
  ClusterRow,
  ClusterView,
  sanitizeRows,
} from "@/lib/clustering/clusterTypes";
import { ClusterTracker } from "@/lib/clustering/clusterTracking";
import { assembleClusters, OUTLIER_ID } from "@/lib/clustering/assembleClusters";
import { orderClusters } from "@/lib/clustering/orderClusters";
import {
  AnomalyEvent,
  detectAnomalies,
  regimeChangeEvents,
} from "@/lib/anomaly/detectAnomalies";
import { useManualAssignmentStore } from "./useManualAssignmentStore";
import { useTemporalNavigationStore } from "./useTemporalNavigationStore";
import {
  awaitPaint,
  recordSample,
  recentComputeMs,
  timed,
} from "@/lib/bench/instrument";
import { createAdaptiveThrottle } from "@/lib/bench/adaptiveThrottle";
import { dataWrappingProcess } from "@/lib/wrapping";
import {
  buildClusteringSettings,
  selectedRange,
  selectWindow,
} from "@/lib/clustering/clusteringSettings";
import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";

interface DataStore {
  aggregated: Record<string, number>[][];
  yDomain: [number, number];
  clusterAssignment: [string, number][];
  /**
   * Stable cluster id for each cluster in `aggregated` (index-aligned). Used for
   * coloring so a cluster keeps its color across ticks even as its DBSCAN
   * discovery position changes.
   */
  clusterIds: number[];
  clusterAssignmentHistory: {
    timestamp: number;
    entries: [string, number][];
  }[];
  highlightInfo: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[][];

  /** Auto-detected, auto-labeled anomalies for the current window. */
  anomalies: AnomalyEvent[];
  /** Every anomaly detected so far (deduplicated, most recent 500). */
  anomalyLog: AnomalyEvent[];

  /**
   * This data is needed only for certain views. It should only be calculated when needed.
   */
  clustersInTime: ClusterView[];

  processData: () => void;
  processClustersInTimeData: () => void;
}

export const useViewModelStore = create<DataStore>((set, get) => {
  // Persists across ticks so cluster ids stay stable as membership evolves.
  const tracker = new ClusterTracker();
  let updateSeq = 0;

  const throttledDataProcess = createAdaptiveThrottle(
    async () => {
      const { dimensions, values, lastAppendAt } = useRawDataStore.getState();
      const {
        chartMode,
        clusterAssignmentHistoryDepth,
        clusterOrderMode,
        layoutMode,
      } = useStreamClustersSettingsStore.getState();

      const {
        eps,
        minPts,
        zNormalize,
        ignoreBoringDataMode,
        dataTicks,
        timeScale,
        meanRange,
        tickRange,
        saveScreenSpace,
      } = useClusterProcessingSettingsStore.getState();
      const dataProcessingSettings: DataProcessingSettings = {
        eps,
        minPts,
        zNormalize,
        ignoreBoringDataMode,
        dataTicks,
        timeScale,
        meanRange,
        tickRange,
        saveScreenSpace,
      };
      // Multi-scale timelines: when the user has brushed/selected an explicit
      // range, cluster that time window instead of the latest N ticks.
      const clusteringSettings = buildClusteringSettings(
        dataProcessingSettings,
        selectedRange(useTemporalNavigationStore.getState())
      );

      const { result: clustered, ms: computeMs } = await timed(() =>
        getClusteringClient().aggregator(values, dimensions, clusteringSettings)
      );

      // Derive stable cluster ids by matching this tick's clusters against the
      // previous tick by member overlap. The WASM `clusterAssignment` maps each
      // dimension to its cluster *position*; we remap those positions to stable
      // ids so colors stay put across ticks.
      const clusterCount = clustered.aggregated.length;
      const membersPerPosition: string[][] = Array.from(
        { length: clusterCount },
        () => []
      );
      for (const [dim, position] of clustered.clusterAssignment) {
        if (position >= 0 && position < clusterCount) {
          membersPerPosition[position].push(dim);
        }
      }
      const stableIds = tracker.track(membersPerPosition);
      const autoAssignment: [string, number][] =
        clustered.clusterAssignment.map(([dim, position]) => [
          dim,
          position >= 0 ? stableIds[position] ?? position : -1,
        ]);

      // Apply manual / static overrides. When the user has pinned streams (or
      // locked the whole assignment), re-assemble the clusters in JS from the
      // overridden assignment so pinned streams actually move into their target
      // cluster's chart.
      const { pins } = useManualAssignmentStore.getState();
      const hasPins = Object.keys(pins).length > 0;
      // Noise points (minPts path) aren't in any WASM cluster, so re-assemble in
      // JS to surface them as a trailing "Outliers" cluster.
      const hasNoise = autoAssignment.some(([, id]) => id === OUTLIER_ID);

      let rawAggregated: ClusterRow[][];
      let clusterIds: number[];
      let clusterAssignment: [string, number][];

      if (hasPins || hasNoise) {
        const overridden = new Map<string, number>(autoAssignment);
        for (const [dim, id] of Object.entries(pins)) overridden.set(dim, id);

        const window = sanitizeRows(selectWindow(values, clusteringSettings));
        const assembled = assembleClusters(window, dimensions, overridden);
        rawAggregated = assembled.aggregated;
        clusterIds = assembled.clusterIds;
        clusterAssignment = dimensions.map((dim) => [
          dim,
          overridden.get(dim) ?? -1,
        ]);
      } else {
        rawAggregated = clustered.aggregated;
        clusterIds = stableIds;
        clusterAssignment = autoAssignment;
      }

      // "Boring data" compression stays in JS and is applied to the (possibly
      // re-assembled) clustered output.
      const wrappedAggregated = await dataWrappingProcess(
        rawAggregated,
        dataProcessingSettings
      );

      const aggregated = {
        aggregated: wrappedAggregated,
        yDomain: clustered.yDomain,
        clusterAssignment,
      };

      const sample = recordSample({
        at: Date.now(),
        seq: ++updateSeq,
        layout: layoutMode,
        nStreams: dimensions.length,
        clusterCount,
        dataTicks: clusteringSettings.dataTicks,
        eps: clusteringSettings.eps,
        minPts: clusteringSettings.minPts,
        computeMs,
      });

      const lastTimestamp =
        values?.[values.length - 1]?.["timestamp"] ?? Date.now();

      const clusterAssignmentHistory = get().clusterAssignmentHistory;
      const updatedClusterAssignmentHistory = clusterAssignmentHistory
        .toSpliced(0, 0, {
          timestamp: lastTimestamp,
          entries: clusterAssignment,
        })
        .slice(0, 20);

      let highlightInfo: {
        dimension: string;
        opacity: number;
        lastDimension: number | undefined;
      }[][] = [];
      if (chartMode === "highlighted") {
        highlightInfo = await highlighter(
          aggregated.aggregated,
          clusterAssignment,
          updatedClusterAssignmentHistory.slice(
            0,
            clusterAssignmentHistoryDepth
          )
        );
      }

      // Adaptive ordering / prioritization: reorder clusters by the chosen
      // significance metric (outliers always last). Color is keyed by stable id,
      // so reordering never recolors a cluster.
      const ordered = orderClusters(
        aggregated.aggregated,
        clusterIds,
        highlightInfo,
        clusterOrderMode
      );

      // Auto-detect + auto-label anomalies (value spikes/drops plus
      // cluster-membership regime changes) for the current window.
      const anomalies = [
        ...detectAnomalies(ordered.aggregated, ordered.clusterIds),
        ...regimeChangeEvents(
          ordered.highlightInfo,
          ordered.clusterIds,
          lastTimestamp
        ),
      ];

      updateClusterColorSlots(ordered.clusterIds);
      set({
        aggregated: ordered.aggregated,
        yDomain: aggregated.yDomain,
        clusterAssignment,
        clusterIds: ordered.clusterIds,
        clusterAssignmentHistory: updatedClusterAssignmentHistory,
        highlightInfo: ordered.highlightInfo,
        anomalies,
        anomalyLog: appendAnomalies(get().anomalyLog, anomalies),
      });
      awaitPaint((paintedAt, committedAt) => {
        sample.renderMs = paintedAt - committedAt;
        sample.latencyMs = paintedAt - lastAppendAt;
      });
    },
    {
      // Adaptive throttling: refresh cadence tracks measured clustering cost
      // (recent compute time) instead of a fixed 2s, so it speeds up for cheap
      // workloads and backs off for expensive ones.
      getCostMs: () => recentComputeMs(3),
      minMs: 500,
      maxMs: 5000,
      factor: 3,
    }
  );

  const throttledClustersInTimeProcess = _.throttle(
    async () => {
      const timerName = Date.now();

      console.time(
        "ViewModel cluster in time process duration " + String(timerName)
      );
      const dimensions = useRawDataStore.getState().dimensions;
      const values = useRawDataStore.getState().values;

      // Same clustering parameters as the live view (eps, minPts,
      // z-normalization, window length). The selected range is not applied
      // here: this series is the *context* for the timeline overview, and
      // focus views filter it to the selected range themselves.
      const clusteringSettings = buildClusteringSettings(
        useClusterProcessingSettingsStore.getState()
      );

      const { clustersInTime } = await getOverTimeClusteringClient().clusteringOverTime(
        values,
        dimensions,
        clusteringSettings
      );

      console.timeEnd(
        "ViewModel cluster in time process duration " + String(timerName)
      );

      // Stable ids across the series (positions differ between windows), so
      // a cluster keeps its colour along the time axis of the cluster map.
      const overTimeTracker = new ClusterTracker();
      const stableClustersInTime = clustersInTime.map(({ timestamp, clusters }) => {
        const count = Math.max(0, ...clusters.map(([, position]) => position + 1));
        const members: string[][] = Array.from({ length: count }, () => []);
        for (const [dim, position] of clusters) if (position >= 0) members[position].push(dim);
        const ids = overTimeTracker.track(members);
        return {
          timestamp,
          clusters: clusters.map(
            ([dim, position]) => [dim, position >= 0 ? ids[position] : position] as [string, number]
          ),
        };
      });
      set({ clustersInTime: stableClustersInTime });
    },
    10000,
    { trailing: true, leading: false }
  );

  return {
    aggregated: [],
    yDomain: [0, 10],
    clusterAssignment: [],
    clusterIds: [],
    clusterAssignmentHistory: [],
    anomalies: [],
    anomalyLog: [],
    clustersInTime: [],
    highlightInfo: [],

    processData: throttledDataProcess,
    processClustersInTimeData: throttledClustersInTimeProcess,
  };
});

const ANOMALY_LOG_SIZE = 500;
const anomalyKey = (a: AnomalyEvent) => `${a.timestamp}|${a.dimension}|${a.type}`;

/** Adds anomalies not seen before; keeps the most recent ANOMALY_LOG_SIZE. */
export function appendAnomalies(log: AnomalyEvent[], fresh: AnomalyEvent[]): AnomalyEvent[] {
  const seen = new Set(log.map(anomalyKey));
  const added = fresh.filter((a) => !seen.has(anomalyKey(a)));
  return added.length ? [...log, ...added].slice(-ANOMALY_LOG_SIZE) : log;
}

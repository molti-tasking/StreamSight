import {
  clusteringOverTime,
  ClusterView,
} from "@/app/actions/clusteringOverTime";
import _ from "lodash";
import { create } from "zustand";
import { useClusterProcessingSettingsStore } from "./ClusterProcessingSettingsStore";
import { useRawDataStore } from "./useRawDataStore";
import { useStreamClustersSettingsStore } from "./useStreamClustersSettingsStore";
import { highlighter } from "@/app/actions/highlighting";
import { aggregator } from "@/app/actions/clustering";
import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";

interface DataStore {
  aggregated: Record<string, number>[][];
  yDomain: [number, number];
  clusterAssignment: [string, number][];
  clusterAssignmentHistory: {
    timestamp: number;
    entries: [string, number][];
  }[];
  highlightInfo: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[][];

  /**
   * This data is needed only for certain views. It should only be calculated when needed.
   */
  clustersInTime: ClusterView[];

  processData: () => void;
  processClustersInTimeData: () => void;
}

export const useViewModelStore = create<DataStore>((set, get) => {
  console.log("init view model store");

  const throttledDataProcess = _.throttle(
    async () => {
      const dimensions = useRawDataStore.getState().dimensions;
      const values = useRawDataStore.getState().values;
      const { chartMode, clusterAssignmentHistoryDepth } =
        useStreamClustersSettingsStore.getState();

      const {
        eps,
        ignoreBoringDataMode,
        dataTicks,
        timeScale,
        meanRange,
        tickRange,
        saveScreenSpace,
      } = useClusterProcessingSettingsStore.getState();
      const dataProcessingSettings: DataProcessingSettings = {
        eps,
        ignoreBoringDataMode,
        dataTicks,
        timeScale,
        meanRange,
        tickRange,
        saveScreenSpace,
      };
      console.log("Clustering with: ", dataProcessingSettings.eps);
      const aggregated = await aggregator(
        values,
        dimensions,
        dataProcessingSettings
      );

      console.log("Found amount of clusters: ", aggregated.aggregated.length);
      const lastTimestamp =
        values?.[values.length - 1]?.["timestamp"] ?? Date.now();
      const clusterAssignment: [string, number][] =
        aggregated.clusterAssignment;

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

      set({
        ...aggregated,
        clusterAssignmentHistory: updatedClusterAssignmentHistory,
        highlightInfo,
      });
    },
    2000,
    { trailing: true, leading: false }
  );

  const throttledClustersInTimeProcess = _.throttle(
    async () => {
      const timerName = Date.now();

      console.time(
        "ViewModel cluster in time process duration " + String(timerName)
      );
      const dimensions = useRawDataStore.getState().dimensions;
      const values = useRawDataStore.getState().values;

      const {
        eps,
        ignoreBoringDataMode,
        dataTicks,
        timeScale,
        meanRange,
        tickRange,
        saveScreenSpace,
      } = useClusterProcessingSettingsStore.getState();
      const dataProcessingSettings: DataProcessingSettings = {
        eps,
        ignoreBoringDataMode,
        dataTicks,
        timeScale,
        meanRange,
        tickRange,
        saveScreenSpace,
      };

      const { clustersInTime } = await clusteringOverTime(
        values,
        dimensions,
        dataProcessingSettings
      );

      console.timeEnd(
        "ViewModel cluster in time process duration " + String(timerName)
      );

      set({ clustersInTime });
    },
    10000,
    { trailing: true, leading: false }
  );

  return {
    aggregated: [],
    yDomain: [0, 10],
    clusterAssignment: [],
    clusterAssignmentHistory: [],
    clustersInTime: [],
    highlightInfo: [],

    processData: throttledDataProcess,
    processClustersInTimeData: throttledClustersInTimeProcess,
  };
});

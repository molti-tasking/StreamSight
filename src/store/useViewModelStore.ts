import { ClusteringWorker } from "@/lib/clustering.worker";
import { ClusterView } from "@/lib/clusteringOverTime";
import * as Comlink from "comlink";
import _ from "lodash";
import { create } from "zustand";
import Worker from "../lib/clustering.worker?worker";
import { useClusterProcessingSettingsStore } from "./ClusterProcessingSettingsStore";
import { useRawDataStore } from "./useRawDataStore";
import { useStreamClustersSettingsStore } from "./useStreamClustersSettingsStore";

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

const workerInstance = new Worker({ name: "aggregator" });
const workerApi = Comlink.wrap<ClusteringWorker>(workerInstance);

export const useViewModelStore = create<DataStore>((set, get) => {
  console.log("init view model store");

  const throttledDataProcess = _.throttle(async () => {
    const timerName = Date.now();

    console.time("ViewModel basic data process duration " + String(timerName));
    const dimensions = useRawDataStore.getState().dimensions;
    const values = useRawDataStore.getState().values;
    const { updateSettings, ...streamClusterSettings } =
      useStreamClustersSettingsStore.getState();
    console.log("Settings: ", streamClusterSettings);
    const { updateSettings: update, ...dataProcessingSettings } =
      useClusterProcessingSettingsStore.getState();
    console.log("Settings: ", update);
    const aggregated = await workerApi.aggregator(
      values,
      dimensions,
      dataProcessingSettings
    );
    console.timeEnd(
      "ViewModel basic data process duration " + String(timerName)
    );
    const lastTimestamp = values[values.length - 1]["timestamp"] ?? Date.now();
    const clusterAssignment: [string, number][] = aggregated.clusterAssignment;

    const clusterAssignmentHistory = get().clusterAssignmentHistory;
    const updatedClusterAssignmentHistory = clusterAssignmentHistory
      .toSpliced(0, 0, { timestamp: lastTimestamp, entries: clusterAssignment })
      .slice(0, 20);

    let highlightInfo: {
      dimension: string;
      opacity: number;
      lastDimension: number | undefined;
    }[][] = [];
    if (streamClusterSettings.chartMode === "highlighted") {
      highlightInfo = await workerApi.highlighter(
        aggregated.aggregated,
        clusterAssignment,
        updatedClusterAssignmentHistory.slice(
          0,
          streamClusterSettings.clusterAssignmentHistoryDepth
        )
      );
    }

    set({
      ...aggregated,
      clusterAssignmentHistory: updatedClusterAssignmentHistory,
      highlightInfo,
    });
  }, 2000);

  const throttledClustersInTimeProcess = _.throttle(async () => {
    const timerName = Date.now();

    console.time(
      "ViewModel cluster in time process duration " + String(timerName)
    );
    const dimensions = useRawDataStore.getState().dimensions;
    const values = useRawDataStore.getState().values;
    const { updateSettings, ...streamClusterSettings } =
      useStreamClustersSettingsStore.getState();
    console.log("Settings: ", streamClusterSettings);
    const { updateSettings: update, ...dataProcessingSettings } =
      useClusterProcessingSettingsStore.getState();
    console.log("Settings: ", update);

    const { clustersInTime } = await workerApi.clusteringOverTime(
      values,
      dimensions,
      dataProcessingSettings
    );

    console.timeEnd(
      "ViewModel cluster in time process duration " + String(timerName)
    );

    set({ clustersInTime });
  }, 10000);

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

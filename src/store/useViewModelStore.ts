import { aggregator } from "@/app/actions/clustering";
import {
  clusteringOverTime,
  ClusterView,
} from "@/app/actions/clusteringOverTime";
import { highlighter } from "@/app/actions/highlighting";
import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";
import _ from "lodash";
import { create } from "zustand";
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

export const useViewModelStore = create<DataStore>((set, get) => {
  console.log("init view model store");

  const throttledDataProcess = async () => {
    const dimensions = useRawDataStore.getState().dimensions;
    const rawVals = useRawDataStore.getState().values;
    /**
     * When calling the aggregator server action with objects containing symbol properties 
     * (like vega_id), we receive an error. This occurs when the baseline selection dialog
     * manipulates the data store. To fix this, we create a clean copy by re-parsing 
     * the full data to remove any symbols.
     */

    // This code checks for "symbol" properties, which cannot be parsed by server actions
    // values.forEach((entry) => {
    //   const vals = Object.values(entry);
    //   const symb = vals.find((val) => Object.getOwnPropertySymbols(val));
    //   console.log("Symb: ", symb);
    // });
    const values = JSON.parse(JSON.stringify(rawVals));
    const { chartMode, clusterAssignmentHistoryDepth } =
      useStreamClustersSettingsStore.getState();

    const { eps, clusteringMode, manualClusterAssignments, monitoringPeriod } =
      useClusterProcessingSettingsStore.getState();
    const dataProcessingSettings: DataProcessingSettings = {
      eps,
      clusteringMode,
      manualClusterAssignments,
      monitoringPeriod,
    };

    const aggregated = await aggregator(
      values,
      dimensions,
      dataProcessingSettings
    );

    const lastTimestamp =
      values?.[values.length - 1]?.["timestamp"] ?? Date.now();
    const clusterAssignment: [string, number][] = aggregated.clusterAssignment;

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
        updatedClusterAssignmentHistory.slice(0, clusterAssignmentHistoryDepth)
      );
    }

    set({
      ...aggregated,
      clusterAssignmentHistory: updatedClusterAssignmentHistory,
      highlightInfo,
    });
  };

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
        clusteringMode,
        manualClusterAssignments,
        monitoringPeriod,
      } = useClusterProcessingSettingsStore.getState();
      const dataProcessingSettings: DataProcessingSettings = {
        eps,
        clusteringMode,
        manualClusterAssignments,
        monitoringPeriod,
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

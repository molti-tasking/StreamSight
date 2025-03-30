import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";
import { monitoringPeriodOptions } from "@/lib/utils";
import { create } from "zustand";

export type ClusterProcessingSettingsStore = DataProcessingSettings & {
  updateSettings: (
    newSettings: (val: DataProcessingSettings) => DataProcessingSettings
  ) => void;
};

export const useClusterProcessingSettingsStore =
  create<ClusterProcessingSettingsStore>((set, get) => {
    return {
      clusteringMode: "automatic",
      manualClusterAssignments: {},
      eps: 80,
      monitoringPeriod: monitoringPeriodOptions["1 hour"],
      ignoreBoringDataMode: "off",

      updateSettings: (newSettings) => {
        const newValues = newSettings(get());
        set(newValues);
      },
    };
  });

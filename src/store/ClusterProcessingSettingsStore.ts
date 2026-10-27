import { DEFAULT_EPS_Z_NORMALIZED } from "@/lib/clustering/epsDefaults";
import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";
import { create } from "zustand";
import { useRawDataStore } from "./useRawDataStore";

export type ClusterProcessingSettingsStore = DataProcessingSettings & {
  updateSettings: (
    newSettings: (val: DataProcessingSettings) => DataProcessingSettings
  ) => void;
};

export const useClusterProcessingSettingsStore =
  create<ClusterProcessingSettingsStore>((set, get) => {
    const dataTicks = Math.min(useRawDataStore.getState().values.length, 50);
    return {
      eps: DEFAULT_EPS_Z_NORMALIZED,
      minPts: 2,
      zNormalize: true,
      dataTicks,
      baselineTolerance: 0,
      ignoreBoringDataMode: "off",

      updateSettings: (newSettings) => {
        const newValues = newSettings(get());
        set(newValues);
      },
    };
  });

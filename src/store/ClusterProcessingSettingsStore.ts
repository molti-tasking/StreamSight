import { DEFAULT_EPS_Z_NORMALIZED } from "@/lib/clustering/epsDefaults";
import { DEFAULT_DATA_TICKS } from "@/lib/clustering/clusteringSettings";
import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";
import { create } from "zustand";

export type ClusterProcessingSettingsStore = DataProcessingSettings & {
  updateSettings: (
    newSettings: (val: DataProcessingSettings) => DataProcessingSettings
  ) => void;
};

export const useClusterProcessingSettingsStore =
  create<ClusterProcessingSettingsStore>((set, get) => {
    return {
      eps: DEFAULT_EPS_Z_NORMALIZED,
      minPts: 2,
      zNormalize: true,
      // A constant: the old default, min(values.length, 50), was evaluated at
      // import time when no data was loaded yet, i.e. 0 (an empty window).
      dataTicks: DEFAULT_DATA_TICKS,
      baselineTolerance: 0,
      ignoreBoringDataMode: "off",

      updateSettings: (newSettings) => {
        const newValues = newSettings(get());
        set(newValues);
      },
    };
  });

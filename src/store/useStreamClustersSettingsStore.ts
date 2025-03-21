import { StreamClustersSettings } from "@/lib/settings/StreamClustersSettings";
import { create } from "zustand";

export type StreamClustersSettingsStore = StreamClustersSettings & {
  updateSettings: (
    newSettings: (val: StreamClustersSettings) => StreamClustersSettings
  ) => void;
};

export const useStreamClustersSettingsStore =
  create<StreamClustersSettingsStore>((set, get) => {
    return {
      layoutMode: "grid",
      treemapSignificanceMode: "clusterSize",
      chartMode: "highlighted",
      showClusterAssignments: true,
      clusterAssignmentHistoryDepth: 5,
      clusterAssignmentOrientation: "horizontal",
      showStreamLabel: true,
      showClusterLegend: true,

      updateSettings: (newSettings) => {
        const newValues = newSettings(get());
        set(newValues);
      },
    };
  });

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
      layoutMode: "list",
      treeMapSignificanceMode: "clusterSize",
      chartMode: "multiline",
      showClusterAssignments: true,
      clusterAssignmentHistoryDepth: 5,
      clusterAssignmentOrientation: "horizontal",

      updateSettings: (newSettings) => {
        const newValues = newSettings(get());
        set(newValues);
      },
    };
  });

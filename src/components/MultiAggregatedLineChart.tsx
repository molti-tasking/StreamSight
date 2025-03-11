import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useEffect } from "react";
import { ClusterLegend } from "./ClusterLegend";
import { ClusteredLineChartGrid } from "./ClusteredLineCharts";

// TODO: Make this chart mostly recursive in a way that a user sees a subset whenever he selects one of those charts

export const MultiAggregatedLineChart = () => {
  const values = useRawDataStore((state) => state.values);
  // const dimensions = useRawDataStore((state) => state.dimensions);

  const presentationSettings = useClusterProcessingSettingsStore();

  const processData = useViewModelStore((state) => state.processData);

  useEffect(() => {
    processData();
  }, [presentationSettings, values]);

  return (
    <>
      <ClusterLegend />
      <ClusteredLineChartGrid />
    </>
  );
};

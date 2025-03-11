"use client";

import { AggregatedClusterView } from "@/components/AggregatedClusterView";
import {
  ClusteredLineChartGrid,
  ClusteredLineChartList,
} from "@/components/ClusteredLineCharts";
import { ClusterLegend } from "@/components/ClusterLegend";
import { DataProcessingSettingsDialog } from "@/components/forms/DataProcessingSettingsDialog";
import { VisualizationSettingsDialog } from "@/components/forms/VisualizationSettingsDialog";
import MutliAggregatedTreeMap from "@/components/MutliAggregatedTreeMap";
import { Button } from "@/components/ui/button";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useEffect } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

export default function StreamClustersPage() {
  const aggregated = useViewModelStore((store) => store.aggregated);
  return (
    <div className="container w-full py-2 flex flex-col flex-wrap gap-2 h-full">
      <div className="flex flex-row justify-between gap-4 items-center">
        <div className="text-muted-foreground">
          Detected {aggregated.length} clusters.
        </div>
        <div className="flex flex-row gap-2">
          <DataProcessingSettingsDialog />
          <VisualizationSettingsDialog />
        </div>
      </div>
      <ErrorBoundary fallbackRender={ResetErrorBoundary}>
        <StreamClusters />
      </ErrorBoundary>
    </div>
  );
}

const StreamClusters = () => {
  const { showClusterAssignments } = useStreamClustersSettingsStore();
  const values = useRawDataStore((state) => state.values);
  const presentationSettings = useClusterProcessingSettingsStore();
  const processData = useViewModelStore((state) => state.processData);
  useEffect(() => {
    processData();
  }, [presentationSettings, values, processData]);

  return (
    <>
      {showClusterAssignments && <ClusterLegend />}
      <ChartViewDisplay />
    </>
  );
};

const ChartViewDisplay = () => {
  const { layoutMode } = useStreamClustersSettingsStore();

  if (layoutMode === "clusterMap") {
    return <AggregatedClusterView />;
  } else if (layoutMode === "grid") {
    return <ClusteredLineChartGrid />;
  } else if (layoutMode === "list") {
    return <ClusteredLineChartList />;
  } else if (layoutMode === "treeMap") {
    return <MutliAggregatedTreeMap />;
  }
  return (
    <div>
      Chart View Display
      <div>{layoutMode}</div>
    </div>
  );
};

const ResetErrorBoundary = ({ resetErrorBoundary, error }: FallbackProps) => {
  return (
    <div>
      <p>⚠️Something went wrong building the cluster map</p>
      <pre>{JSON.stringify(error, null, 2)}</pre>
      <Button onClick={resetErrorBoundary}>Reset Error</Button>
    </div>
  );
};

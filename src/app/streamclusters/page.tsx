"use client";

import { AggregatedClusterView } from "@/components/AggregatedClusterView";
import { BaselineClusterChart } from "@/components/charts/BaselineClusterChart";
import {
  ClusteredLineChartGrid,
  ClusteredLineChartList,
} from "@/components/ClusteredLineCharts";
import { ClusterLegend } from "@/components/ClusterLegend";
import { AllStreamsDialog } from "@/components/forms/AllStreamsDialog";
import { DataProcessingSettingsDialog } from "@/components/forms/DataProcessingSettingsDialog";
import { StreamClustersBar } from "@/components/forms/StreamClustersBar";
import { TreemapLayout } from "@/components/TreemapLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import Link from "next/link";
import { useEffect } from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

export default function StreamClustersPage() {
  const dimensions = useRawDataStore((store) => store.dimensions);
  const aggregated = useViewModelStore((store) => store.aggregated);
  const showClusterAssignments = useStreamClustersSettingsStore(
    (store) => store.showClusterAssignments
  );
  const clusterAssignmentOrientation = useStreamClustersSettingsStore(
    (store) => store.clusterAssignmentOrientation
  );
  return (
    <>
      <div className="flex flex-row justify-between border-b overflow-x-scroll">
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center gap-8">
            <Link href={"/"} className="bg-primary py-2 px-4 rounded-xs">
              <span className="text-white font-semibold text-xl tracking-tight">
                Stream Sight
              </span>
            </Link>
            {/* <ExplorationStuff /> */}
          </div>
          <div className="flex flex-row justify-end gap-2 items-center my-1">
            <div className="text-muted-foreground text-sm">
              {dimensions.length} streams / {aggregated.length} clusters
            </div>

            <div className="flex flex-row gap-0.5">
              <AllStreamsDialog />
              <DataProcessingSettingsDialog />
            </div>
          </div>
        </div>
        <StreamClustersBar />
      </div>
      <div className={"w-screen flex-1"} style={{ overflow: "overlay" }}>
        <div
          className={cn(
            "w-screen p-2 flex gap-2 h-full",
            showClusterAssignments &&
              clusterAssignmentOrientation === "horizontal"
              ? "flex-col flex-wrap"
              : "flex-row"
          )}
        >
          <ErrorBoundary fallbackRender={ResetErrorBoundary}>
            <StreamClusters />
          </ErrorBoundary>
        </div>
      </div>
    </>
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
  const layoutMode = useStreamClustersSettingsStore(
    (state) => state.layoutMode
  );
  const clusters = useViewModelStore((state) => state.aggregated);

  if (layoutMode === "clusterMap") {
    return <AggregatedClusterView />;
  } else if (layoutMode === "grid") {
    return <ClusteredLineChartGrid />;
  } else if (layoutMode === "list") {
    return <ClusteredLineChartList />;
  } else if (layoutMode === "treemap") {
    return <TreemapLayout />;
  } else if (layoutMode === "baseline") {
    if (clusters.length < 2 || clusters[0].length < 2) {
      return <p>Not enough data collected yet.</p>;
    }
    return <BaselineClusterChart />;
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

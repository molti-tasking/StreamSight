import { colorForClusterId } from "@/components/clusterColors";
import { useContainerDimensions } from "@/components/useContainerDimensions";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useEffect, useRef } from "react";
import { Chart } from "./Chart";
import { TreemapCharts } from "./TreemapCharts";

export function TreemapLayout() {
  const aggregated = useViewModelStore((data) => data.aggregated);
  const clusterIds = useViewModelStore((state) => state.clusterIds);
  const highlightInfo = useViewModelStore((state) => state.highlightInfo);
  const anomalies = useViewModelStore((state) => state.anomalies);
  const anomaliesFor = (clusterId: number) =>
    anomalies
      .filter((a) => a.clusterId === clusterId)
      .map((a) => ({ timestamp: a.timestamp, label: a.label }));

  const ref = useRef<HTMLDivElement>(null);
  const { height, width } = useContainerDimensions(ref);

  const processData = useViewModelStore((state) => state.processData);
  const values = useRawDataStore((state) => state.values);

  const presentationSettings = useClusterProcessingSettingsStore();

  useEffect(() => {
    processData();
  }, [presentationSettings, values]);

  return (
    <div ref={ref} className="flex-1 min-h-20">
      <TreemapCharts
        width={width}
        height={height}
        leaves={aggregated.map((clusters, index) => {
          const id = clusterIds[index] ?? index;
          const columns = Object.keys(clusters[0] ?? {}).filter(
            (key) => key !== "timestamp"
          );
          return {
            id,
            name: columns.join(", "),
            significance: columns.length,
            // Every tile shows the whole window on the shared time axis, so
            // tiles side by side start and end at the same time.
            content: (
              <Chart
                values={clusters}
                className={"w-full h-full overflow-hidden"}
                highlightInfo={highlightInfo?.[index]}
                anomalies={anomaliesFor(id)}
                chartColor={colorForClusterId(id)}
              />
            ),
          };
        })}
      />
    </div>
  );
}

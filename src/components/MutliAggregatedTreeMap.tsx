import { clusterColors } from "@/components/clusterColors";
import { useContainerDimensions } from "@/components/useContainerDimensions";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useEffect, useRef } from "react";
import { Treemap } from "./Treemap";
import { Chart } from "./Chart";

export function MutliAggregatedTreemap() {
  const aggregated = useViewModelStore((data) => data.aggregated);
  const highlightInfo = useViewModelStore((state) => state.highlightInfo);

  const ref = useRef<HTMLDivElement>(null);
  const { height, width } = useContainerDimensions(ref);

  const processData = useViewModelStore((state) => state.processData);
  const values = useRawDataStore((state) => state.values);

  const presentationSettings = useClusterProcessingSettingsStore();

  useEffect(() => {
    processData();
  }, [presentationSettings, values]);

  console.log("Render aggregated treemap");
  return (
    <div ref={ref} className="flex-1 min-h-20">
      <Treemap
        key={aggregated.length}
        width={width}
        height={height}
        leaves={aggregated.map((clusters, index) => {
          const columns = Object.keys(clusters[0]).filter(
            (_, index) => index !== 0
          );
          const name = columns.join(", ");
          const significance = columns.length;

          return {
            name,
            significance,
            ClusterComponent: ({ currentWidth, totalMaxWidth }) => {
              // In this function we calculate the last few entries for each cluster based on the available space:
              // We want to display the same amount of time per pixel accross all the different time series.
              // So depending on available screen width we want only keep the latest entries that fit into the available space.

              // The implementation below is kind of unprecise because it relies on the underlying charts themselves display the information in the full width.

              const relativeWidth = currentWidth / totalMaxWidth;
              const keptValueCount = Math.ceil(clusters.length * relativeWidth);
              const values = clusters.slice(-keptValueCount);
              return (
                <Chart
                  values={values}
                  key={index}
                  className={"w-full h-full overflow-hidden"}
                  highlightInfo={highlightInfo?.[index]}
                  chartColor={clusterColors[index % clusterColors.length]}
                />
              );
            },
          };
        })}
      />
    </div>
  );
}

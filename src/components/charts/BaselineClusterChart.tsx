import { cn } from "@/lib/utils";
import { useViewModelStore } from "@/store/useViewModelStore";
import { VegaLite, VisualizationSpec } from "react-vega";
import { clusterColors } from "../clusterColors";
import { useMemo } from "react";

export const BaselineClusterChart = () => {
  const clusters = useViewModelStore((state) => state.aggregated);

  const values: { group: string; value: number }[] = useMemo(() => {
    const arr: { group: string; value: number }[] = [];
    clusters.forEach((cluster, index) => {
      const group = `Cluster ${index}`;
      const dimensions = Object.keys(cluster[0]).filter(
        (key) => key !== "timestamp"
      );
      const baseline = cluster[0];
      const dataSet = cluster[cluster.length - 1];
      dimensions.forEach((dimension) =>
        arr.push({ group, value: dataSet[dimension] - baseline[dimension] })
      );
    });
    return arr;
  }, [clusters]);

  const spec: VisualizationSpec = useMemo(
    () => ({
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { values },
      title: "Baseline in %",
      width: "container",
      height: "container",
      background: "transparent",
      layer: [
        {
          mark: "boxplot",
          encoding: {
            x: { field: "group", type: "nominal", axis: { title: null } },
            y: { field: "value", type: "quantitative", axis: { title: null } },
            color: {
              field: "group",
              type: "nominal",
              scale: {
                domain: clusters.map((_, index) => `Cluster ${index}`),
                range: clusterColors,
              },
              legend: null,
            },
          },
        },
        {
          mark: { type: "rule", color: "black", strokeWidth: 3 },
          encoding: {
            y: { datum: 0, type: "quantitative" },
          },
        },
      ],
    }),
    [values, clusters]
  );

  console.log(spec);

  return (
    <div className="flex-1 flex flex-col gap-2 overflow-scroll">
      <VegaLite
        spec={spec}
        actions={true}
        // style={{ cursor: "pointer" }}
        className={cn(
          "w-full h-full flex flex-1",
          "rounded-sm overflow-hidden min-h-20 h-full"
        )}
      />
    </div>
  );
};

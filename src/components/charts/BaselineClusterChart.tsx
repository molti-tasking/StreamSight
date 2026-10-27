import { cn } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { VegaLite, VisualizationSpec } from "react-vega";
import { colorForClusterId } from "../clusterColors";
import { useMemo } from "react";

export const BaselineClusterChart = () => {
  const clusters = useViewModelStore((state) => state.aggregated);
  const clusterIds = useViewModelStore((state) => state.clusterIds);
  const baselineTolerance = useClusterProcessingSettingsStore(
    (state) => state.baselineTolerance ?? 0
  );

  const values: { group: string; value: number; breach: boolean }[] = useMemo(() => {
    const arr: { group: string; value: number; breach: boolean }[] = [];
    clusters.forEach((cluster, index) => {
      const group = `Cluster ${index}`;
      const dimensions = Object.keys(cluster[0]).filter(
        (key) => key !== "timestamp"
      );
      const baseline = cluster[0];
      const dataSet = cluster[cluster.length - 1];
      dimensions.forEach((dimension) => {
        const value = dataSet[dimension] - baseline[dimension];
        const breach =
          baselineTolerance > 0 && Math.abs(value) > baselineTolerance;
        arr.push({ group, value, breach });
      });
    });
    return arr;
  }, [clusters, baselineTolerance]);

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
                // Per-cluster color keyed by stable id so colors persist as
                // cluster order changes between ticks.
                range: clusters.map((_, index) =>
                  colorForClusterId(clusterIds[index] ?? index)
                ),
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
        // Tolerance band: dashed red rules at ±tolerance, plus red points for
        // streams whose deviation from baseline breaches it.
        ...(baselineTolerance > 0
          ? [
              {
                mark: {
                  type: "rule" as const,
                  color: "#DC2626",
                  strokeDash: [4, 2],
                },
                encoding: {
                  y: { datum: baselineTolerance, type: "quantitative" as const },
                },
              },
              {
                mark: {
                  type: "rule" as const,
                  color: "#DC2626",
                  strokeDash: [4, 2],
                },
                encoding: {
                  y: {
                    datum: -baselineTolerance,
                    type: "quantitative" as const,
                  },
                },
              },
              {
                transform: [{ filter: "datum.breach" }],
                mark: {
                  type: "point" as const,
                  color: "#DC2626",
                  filled: true,
                  size: 40,
                },
                encoding: {
                  x: { field: "group", type: "nominal" as const },
                  y: { field: "value", type: "quantitative" as const },
                },
              },
            ]
          : []),
      ],
    }),
    [values, clusters, clusterIds, baselineTolerance]
  );

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

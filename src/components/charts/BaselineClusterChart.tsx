import { cn } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import type { VisualizationSpec } from "vega-embed";
import { VegaChart, VL_SCHEMA } from "@/components/charts/VegaChart";
import { ANOMALY_COLOR, colorForClusterId } from "../clusterColors";
import { useMemo } from "react";
import { changesSinceWindowStart } from "@/lib/clustering/baseline";

const clusterLabel = (id: number) => (id < 0 ? "Outliers" : `Cluster ${id}`);

/**
 * Box plot per cluster of how far each member stream has moved since the
 * start of the window ("baseline"). Box = interquartile range with the
 * median; whiskers reach the furthest member within 1.5 x IQR of the box
 * (Tukey); points beyond them are drawn individually.
 */
export const BaselineClusterChart = () => {
  const clusters = useViewModelStore((state) => state.aggregated);
  const clusterIds = useViewModelStore((state) => state.clusterIds);
  const anomalies = useViewModelStore((state) => state.anomalies);
  const baselineTolerance = useClusterProcessingSettingsStore(
    (state) => state.baselineTolerance ?? 0
  );

  const groups = useMemo(
    () => clusters.map((_, index) => clusterLabel(clusterIds[index] ?? index)),
    [clusters, clusterIds]
  );

  // Auto-detected anomalies of member streams in this window, by stream.
  const anomalyLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const a of anomalies) {
      labels.set(a.dimension, labels.has(a.dimension) ? `${labels.get(a.dimension)}; ${a.label}` : a.label);
    }
    return labels;
  }, [anomalies]);

  const values = useMemo(
    () =>
      clusters.flatMap((cluster, index) =>
        changesSinceWindowStart(cluster).map(({ stream, change }) => ({
          group: groups[index],
          stream,
          value: change,
          breach: baselineTolerance > 0 && Math.abs(change) > baselineTolerance,
          anomaly: anomalyLabels.get(stream) ?? "",
        }))
      ),
    [clusters, groups, baselineTolerance, anomalyLabels]
  );

  const spec: VisualizationSpec = useMemo(
    () => ({
      $schema: VL_SCHEMA,
      data: { values },
      title: {
        text: "Change since the start of the window",
        subtitle:
          "Box: quartiles and median of the member streams. Whiskers: furthest member within 1.5 × IQR. Points: members beyond the whiskers.",
        subtitleFontSize: 10,
      },
      width: "container",
      height: "container",
      background: "transparent",
      layer: [
        {
          mark: { type: "boxplot", extent: 1.5, median: { color: "black" } },
          encoding: {
            x: { field: "group", type: "nominal", sort: groups, axis: { title: null, labelAngle: 0 } },
            y: {
              field: "value",
              type: "quantitative",
              axis: { title: "Δ since window start (data units)" },
            },
            color: {
              field: "group",
              type: "nominal",
              scale: {
                domain: groups,
                // Keyed by stable id so colors persist as cluster order changes.
                range: clusters.map((_, index) =>
                  colorForClusterId(clusterIds[index] ?? index)
                ),
              },
              legend: null,
            },
          },
        },
        {
          mark: { type: "rule", color: "black", strokeWidth: 2 },
          encoding: {
            y: { datum: 0, type: "quantitative" },
          },
        },
        // Members with a detected anomaly: triangles, label as tooltip.
        {
          transform: [{ filter: "datum.anomaly !== ''" }],
          mark: {
            type: "point" as const,
            shape: "triangle-up",
            color: ANOMALY_COLOR,
            filled: true,
            size: 60,
          },
          encoding: {
            x: { field: "group", type: "nominal" as const, sort: groups },
            y: { field: "value", type: "quantitative" as const },
            tooltip: [
              { field: "stream", type: "nominal" as const },
              { field: "anomaly", type: "nominal" as const },
            ],
          },
        },
        // Tolerance band: dashed rules at ±tolerance, plus diamonds for
        // streams whose change breaches it.
        ...(baselineTolerance > 0
          ? [
              {
                data: {
                  values: [
                    { y: baselineTolerance, label: `+${baselineTolerance} tolerance` },
                    { y: -baselineTolerance, label: `−${baselineTolerance} tolerance` },
                  ],
                },
                layer: [
                  {
                    mark: { type: "rule" as const, color: ANOMALY_COLOR, strokeDash: [4, 2] },
                    encoding: { y: { field: "y", type: "quantitative" as const } },
                  },
                  {
                    mark: { type: "text" as const, color: ANOMALY_COLOR, align: "left" as const, x: 4, dy: -6, fontSize: 10 },
                    encoding: {
                      y: { field: "y", type: "quantitative" as const },
                      text: { field: "label" },
                    },
                  },
                ],
              },
              {
                transform: [{ filter: "datum.breach" }],
                mark: {
                  type: "point" as const,
                  shape: "diamond",
                  color: ANOMALY_COLOR,
                  filled: true,
                  size: 50,
                },
                encoding: {
                  x: { field: "group", type: "nominal" as const, sort: groups },
                  y: { field: "value", type: "quantitative" as const },
                  tooltip: [
                    { field: "stream", type: "nominal" as const },
                    { field: "value", type: "quantitative" as const, format: ".3~g" },
                  ],
                },
              },
            ]
          : []),
      ],
    }),
    [values, groups, clusters, clusterIds, baselineTolerance]
  );

  return (
    <div className="flex-1 flex flex-col gap-2 overflow-scroll">
      <VegaChart
        spec={spec}
        actions={true}
        className={cn(
          "w-full h-full flex flex-1",
          "rounded-sm overflow-hidden min-h-20 h-full"
        )}
      />
    </div>
  );
};

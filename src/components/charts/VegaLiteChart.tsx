import { cn, deepMerge } from "@/lib/utils";
import type { VisualizationSpec } from "vega-embed";
import { VegaChart, VL_SCHEMA } from "@/components/charts/VegaChart";
import { useTimeAxis } from "./useTimeAxis";
import { anomalyLayers } from "./anomalyLayers";
import { ChartProps } from "./ChartProps";
import { LegendButton } from "./LegendButton";
import { useMemo } from "react";

const chartModeSpecs: Record<
  "multiline" | "envelope",
  Partial<VisualizationSpec>
> = {
  multiline: {
    encoding: {
      color: {
        field: "variable",
        type: "nominal",
        title: null,
      },
    },
  },
  envelope: {
    transform: [
      {
        calculate: "toNumber(datum.value)",
        as: "value",
      },
      {
        calculate: "toNumber(datum.timestamp)",
        as: "timestamp",
      },
      {
        aggregate: [
          { op: "mean", field: "value", as: "mean_value" },
          { op: "max", field: "value", as: "max_value" },
          { op: "min", field: "value", as: "min_value" },
          { op: "q1", field: "value", as: "q1_value" },
          { op: "q3", field: "value", as: "q3_value" },
        ],
        groupby: ["timestamp"],
      },
      {
        fold: ["mean_value", "max_value", "min_value", "q1_value", "q3_value"],
        as: ["aggregation", "value"],
      },
    ],
    layer: [
      {
        mark: {
          type: "area",
          color: "steelblue",
          opacity: 0.3,
        },
        encoding: {
          x: {
            field: "timestamp",
            type: "temporal",
          },
          y: {
            field: "q1_value",
            type: "quantitative",
          },
          y2: {
            field: "q3_value",
          },
        },
      },
      {
        // Mean line (solid)
        mark: {
          type: "line",
          tooltip: true,
        },
        encoding: {
          x: {
            field: "timestamp",
            type: "temporal",
          },
          y: {
            field: "value",
            type: "quantitative",
          },
          color: {
            field: "aggregation",
            type: "nominal",

            scale: {
              domain: ["mean_value", "max_value", "min_value"],
              range: ["steelblue", "steelblue", "steelblue"],
            },
          },
          strokeDash: {
            field: "aggregation",
            legend: null,
            type: "nominal",
            scale: {
              domain: ["max_value", "min_value"],
              range: [
                [4, 4],
                [4, 4],
              ],
            },
          },
        },
      },
    ],
  },
};

export const VegaLiteChart = ({
  values,
  className,
  yDomain,
  saveScreenSpace,
  mode,
  anomalies,
}: ChartProps) => {
  const timeAxis = useTimeAxis();
  const dimensions = useMemo(
    () =>
      values.length
        ? Object.keys(values[0]).filter((e) => e !== "timestamp")
        : [],
    [values]
  );

  // Rebuilding + deep-merging the spec on every render is expensive with 30+
  // live charts; memoize on the inputs that change.
  const spec = useMemo(() => {
    const dataSpec: Partial<VisualizationSpec> = {
      $schema: VL_SCHEMA,
      width: "container",
      height: "container",
      background: "transparent",

      padding: 0,
      // Try to ensure it resizes to fill container space without extra padding
      autosize: {
        type: "fit",
        contains: "padding",
      },

      // Domains come in as params (see VegaChart), so a tick does not
      // change the spec's structure.
      params: [
        { name: "xmin", value: 0 },
        { name: "xmax", value: 1 },
        { name: "ymin", value: 0 },
        { name: "ymax", value: 1 },
      ],
      data: { values },
      transform: [{ fold: dimensions, as: ["variable", "value"] }],

      mark: "line",
      encoding: {
        x: {
          field: "timestamp",
          type: !!saveScreenSpace ? "ordinal" : "temporal",
          ...(saveScreenSpace
            ? {}
            : { scale: { type: timeAxis.scale.type, domain: { expr: "[xmin, xmax]" } } }),
          axis: !!saveScreenSpace ? { labelExpr: "", title: null } : timeAxis.axis,
        },
        y: {
          field: "value",
          type: "quantitative",
          scale: { domain: { expr: "[ymin, ymax]" } },
          title: null,
          axis: {
            labelPadding: -20,
            labelOpacity: 0.5,
            ticks: false,
            domain: false,
          },
        },
        color: { legend: null },
      },
    };

    // I don't 100% know why, but as of now it was very important to keep this order of the specs how they are getting passed into the merge function. Otherwise, the vizualisation breaks.
    const merged = deepMerge(
      dataSpec,
      chartModeSpecs[mode as "multiline" | "envelope"]
    ) as Record<string, unknown> & { encoding?: { x?: unknown } };
    if (!anomalies?.length) return merged as VisualizationSpec;
    // Wrap the chart in a layer so anomaly markers can share its x axis.
    const { $schema, width, height, background, padding, autosize, data, params, ...view } = merged;
    return {
      $schema,
      width,
      height,
      background,
      padding,
      autosize,
      params,
      data,
      encoding: { x: merged.encoding?.x },
      layer: [view, ...anomalyLayers(anomalies)],
    } as VisualizationSpec;
  }, [values, dimensions, saveScreenSpace, mode, timeAxis.scale.type, timeAxis.axis, anomalies]);
  const params = useMemo(
    () => ({ xmin: timeAxis.domain[0], xmax: timeAxis.domain[1], ymin: yDomain[0], ymax: yDomain[1] }),
    [timeAxis.domain, yDomain]
  );

  return (
    <div
      className={"flex-1 rounded-sm overflow-hidden min-h-20 h-full relative"}
    >
      <LegendButton dimensions={dimensions}>
        <VegaChart
          spec={spec}
          params={params}
          actions={false}
          style={{ cursor: "pointer" }}
          className={cn(
            className,
            "w-full h-full flex flex-1",
            "rounded-sm overflow-hidden min-h-20 h-full"
          )}
        />
      </LegendButton>
    </div>
  );
};

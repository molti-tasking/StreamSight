import { cn, deepMerge } from "@/lib/utils";
import { VegaLite, type VisualizationSpec } from "react-vega";
import { ChartProps } from "./ChartProps";

const chartModeSpecs: Record<
  "multiline" | "envelope",
  Partial<VisualizationSpec>
> = {
  multiline: {
    encoding: {
      color: {
        field: "variable",
        type: "nominal",
        title: "Variables",
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
            title: "Time",
          },
          y: {
            field: "q1_value",
            type: "quantitative",
            title: "Value",
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
            title: "Time",
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
}: ChartProps) => {
  const dimensions = values.length
    ? Object.keys(values[0]).filter((e) => e !== "timestamp")
    : [];
  const dataSpec: Partial<VisualizationSpec> = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: "container",
    background: "transparent",

    data: { values },
    transform: [{ fold: dimensions, as: ["variable", "value"] }],
    mark: "line",
    encoding: {
      x: {
        field: "timestamp",
        type: !!saveScreenSpace ? "ordinal" : "temporal",
        axis: !!saveScreenSpace ? { labelExpr: "" } : undefined,
        title: "Time",
      },
      y: {
        field: "value",
        type: "quantitative",
        title: "Value",
        scale: { domain: yDomain },
      },
    },
  };

  // I don't 100% know why, but as of now it was very important to keep this order of the specs how they are getting passed into the merge function. Otherwise, the vizualisation breaks.
  const spec = deepMerge(
    dataSpec,
    chartModeSpecs[mode as "multiline" | "envelope"]
  );

  return (
    <VegaLite
      spec={spec}
      actions={false}
      style={{ cursor: "pointer" }}
      className={cn("flex-1", className, "rounded-sm overflow-hidden min-h-40")}
    />
  );
};

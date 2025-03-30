import { cn, deepMerge } from "@/lib/utils";
import dynamic from "next/dynamic";
import { type VisualizationSpec } from "react-vega";
import { ChartProps } from "./ChartProps";
import { LegendButton } from "./LegendButton";
const VegaLite = dynamic(() => import("react-vega").then((m) => m.VegaLite), {
  ssr: false,
});
/**
 * Add this code for the baseline reference visualisation into the layer array:
 * 
 * 
 *     {
      "mark": {"opacity": 0.3, "type": "area", "color": "#85C5A6"},
      "encoding": {
        "y": {
          "aggregate": "average",
          "field": "temp_max",
          "scale": {"domain": [0, 30]},
          "title": "Avg. Temperature (°C)",
          "axis": {"titleColor": "#85C5A6"}
        },

        "y2": {
          "aggregate": "average",
          "field": "temp_min"
        }
      }
    },
 */

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
  baselineValues,
}: ChartProps) => {
  const dimensions = values.length
    ? Object.keys(values[0]).filter((e) => e !== "timestamp")
    : [];
  const clusterBaselines = baselineValues
    ? dimensions.map((dim) => baselineValues[dim])
    : undefined;
  const minBaseline = clusterBaselines
    ? Math.min(...clusterBaselines)
    : undefined;
  const maxBaseline = clusterBaselines
    ? Math.max(...clusterBaselines)
    : undefined;

  const dataSpec: Partial<VisualizationSpec> = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: "container",
    background: "transparent",

    padding: 0,
    // Try to ensure it resizes to fill container space without extra padding
    autosize: {
      type: "fit",
      contains: "padding",
    },

    data: { values },
    transform: [{ fold: dimensions, as: ["variable", "value"] }],

    layer: [
      ...(minBaseline && maxBaseline
        ? [
            {
              mark: { type: "area", opacity: 0.5 },
              encoding: {
                x: { field: "timestamp", type: "temporal" },
                y: { datum: minBaseline },
                y2: { datum: maxBaseline },
                color: { value: "lightgrey" },
              },
            } as const,
          ]
        : []),
      {
        mark: "line",
        encoding: {
          x: {
            field: "timestamp",
            type: !!saveScreenSpace ? "ordinal" : "temporal",
            axis: !!saveScreenSpace ? { labelExpr: "" } : {},
            title: null,
          },
          y: {
            field: "value",
            type: "quantitative",
            ...(!!yDomain && { scale: { domain: yDomain } }),
            title: null,
            axis: {
              labelPadding: -20,
              labelOpacity: 0.5,
              ticks: false,
              domain: false,
            },
          },
          color: {
            field: "variable",
            type: "nominal",
            title: null,
            legend: null,
          },
        },
      },
    ],
  };

  // I don't 100% know why, but as of now it was very important to keep this order of the specs how they are getting passed into the merge function. Otherwise, the vizualisation breaks.
  const spec = deepMerge(
    dataSpec,
    chartModeSpecs[mode as "multiline" | "envelope"]
  );

  return (
    <div
      className={"flex-1 rounded-sm overflow-hidden min-h-20 h-full relative"}
    >
      <LegendButton dimensions={dimensions}>
        <VegaLite
          spec={spec}
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

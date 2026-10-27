import { cn, escapeVegaString } from "@/lib/utils";
import type { VisualizationSpec } from "vega-embed";
import { VegaChart, VL_SCHEMA } from "@/components/charts/VegaChart";
import { colorForClusterId } from "../clusterColors";
import { ChartProps } from "./ChartProps";
import { useStreamSelectionStore } from "@/store/useStreamSelectionStore";
import type { UnitSpec } from "vega-lite/types_unstable/spec/unit.js";
import { LegendButton } from "./LegendButton";
import { useMemo } from "react";

export const VegaLiteHighlightedChart = ({
  values,
  chartColor,
  yDomain,
  saveScreenSpace,
  className,
  highlightInfo,
  anomalies,
}: ChartProps & {
  highlightInfo?: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[];
  anomalies?: { timestamp: number; label: string }[];
  chartColor: string;
}) => {
  const selectedStreams = useStreamSelectionStore((state) => state.values);
  const dimensions: string[] = useMemo(
    () =>
      values.length
        ? Object.keys(values[0]).filter((e) => e !== "timestamp")
        : [],
    [values]
  );

  // This is the heaviest spec in the app and is rebuilt for every cluster on
  // every streaming tick; memoize on the inputs that actually change.
  const spec: VisualizationSpec = useMemo(() => {
    let spec: VisualizationSpec;

    if (values?.[0] && Object.keys(values[0]).length === 2) {
    spec = {
      $schema: VL_SCHEMA,
      width: "container",
      height: "container",
      background: "transparent",

      padding: 0,
      // Try to ensure it resizes to fill container space without extra padding
      autosize: { type: "fit", contains: "padding" },
      data: { values },
      transform: [{ fold: dimensions, as: ["variable", "value"] }],
      mark: { type: "line", color: chartColor },
      encoding: {
        x: {
          field: "timestamp",
          type: !!saveScreenSpace ? "ordinal" : "temporal",
          axis: {
            tickColor: {
              condition: { value: chartColor, test: "true" },
              value: chartColor,
            },
            gridColor: chartColor,
            gridOpacity: 0.1,
            domainColor: chartColor,
          },
          title: null,
        },
        y: {
          field: "value",
          type: "quantitative",
          scale: { domain: yDomain },
          title: null,

          axis: {
            tickColor: {
              condition: { value: chartColor, test: "true" },
              value: chartColor,
            },
            gridColor: chartColor,
            gridOpacity: 0.1,
            domainColor: chartColor,
            labelPadding: -20,
            labelOpacity: 0.5,
            ticks: false,
            domain: false,
          },
        },
      },
    };
  } else {
    spec = {
      $schema: VL_SCHEMA,

      padding: 0,
      width: "container",
      height: "container",
      background: "transparent",
      // Try to ensure it resizes to fill container space without extra padding
      autosize: {
        type: "fit",
        contains: "padding",
      },

      data: { values },
      transform: [{ fold: dimensions, as: ["variable", "value"] }],

      mark: "line",
      encoding: {
        x: {
          field: "timestamp",
          type: !!saveScreenSpace ? "ordinal" : "temporal",
          axis: !!saveScreenSpace
            ? { labelExpr: "" }
            : {
                // labelPadding: -20,
                // ticks: false,
                // domain: false,
              },
        },
        y: {
          field: "value",
          type: "quantitative",
          scale: { domain: yDomain },
          axis: {
            labelPadding: -20,
            labelOpacity: 0.5,
            ticks: false,
            domain: false,
          },
        },
        color: { legend: null },
      },

      layer: [
        {
          transform: [
            ...(!!highlightInfo?.length
              ? [
                  {
                    fold: highlightInfo?.map(({ dimension }) => dimension),
                    as: ["variable", "column"] as [string, string],
                  },
                ]
              : []),
            { calculate: "toNumber(datum.value)", as: "value" },
            { calculate: "toNumber(datum.timestamp)", as: "timestamp" },
          ],
          mark: { type: "line" },
          encoding: {
            x: { field: "timestamp", type: "temporal" },
            y: { field: "column", type: "quantitative" },

            color: {
              field: "variable",
              type: "ordinal",
              condition: highlightInfo?.map(({ dimension, lastDimension }) => {
                // We want to render the highlighted line in the color of the previous chart
                const clusterColor =
                  lastDimension !== undefined
                    ? colorForClusterId(lastDimension)
                    : "gray";
                return {
                  test: `datum.variable === '${escapeVegaString(dimension)}'`,
                  value: clusterColor, // Use the color property from highlightInfo
                };
              }),
            },

            opacity: {
              condition: highlightInfo?.map(({ dimension, opacity }) => ({
                test: `datum.variable === '${escapeVegaString(dimension)}'`,
                value: dimensions.length < 3 ? 1.0 : opacity,
              })),
              value: 0.3,
            },
          },
        },
        {
          mark: { type: "area", color: chartColor, opacity: 0.3 },
          encoding: {
            x: {
              field: "timestamp",
              type: "temporal",
              title: "",
              axis: {
                tickColor: {
                  condition: { value: chartColor, test: "true" },
                  value: chartColor,
                },
                gridColor: chartColor,
                gridOpacity: 0.1,
                domainColor: chartColor,
              },
            },
            y: {
              field: "min_value",
              type: "quantitative",
              title: "",
              axis: {
                tickColor: {
                  condition: { value: chartColor, test: "true" },
                  value: chartColor,
                },
                gridColor: chartColor,
                gridOpacity: 0.1,
                domainColor: chartColor,
              },
            },
            y2: { field: "max_value" },
          },
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
              fold: [
                "mean_value",
                "max_value",
                "min_value",
                "q1_value",
                "q3_value",
              ],
              as: ["aggregation", "value"],
            },
          ],
        },

        ...selectedStreams?.flatMap((value) => {
          const safeValue = escapeVegaString(value);
          return [
            {
              mark: "line",
              encoding: {
                y: { field: "value", type: "quantitative" },
                color: {
                  field: "variable",
                  type: "nominal",
                  legend: null,
                  condition: {
                    test: `datum.variable === '${safeValue}'`,
                    value: "black",
                  },
                },
                opacity: {
                  condition: {
                    test: `datum.variable === '${safeValue}'`,
                    value: 1,
                  },
                  value: 0,
                },
              },
            } as UnitSpec<string>,
            {
              mark: { type: "text", align: "right", dy: -5 },
              encoding: {
                x: { field: "timestamp", type: "temporal", aggregate: "max" },
                y: {
                  field: "value",
                  type: "quantitative",
                  aggregate: "max",
                },
                text: { value },
              },
              transform: [{ filter: `datum.variable === '${safeValue}'` }],
            } as UnitSpec<string>,
          ];
        }),

        // Anomaly markers: dashed red rules at flagged timestamps, with the
        // auto-generated label as a tooltip.
        ...(anomalies?.length
          ? [
              {
                data: {
                  values: anomalies.map((a) => ({
                    timestamp: a.timestamp,
                    label: a.label,
                  })),
                },
                mark: {
                  type: "rule",
                  color: "#DC2626",
                  strokeDash: [4, 2],
                  opacity: 0.8,
                },
                encoding: {
                  x: { field: "timestamp", type: "temporal" },
                  tooltip: { field: "label", type: "nominal" },
                },
              } as UnitSpec<string>,
            ]
          : []),
      ],
      };
    }
    return spec;
  }, [
    values,
    dimensions,
    chartColor,
    yDomain,
    saveScreenSpace,
    highlightInfo,
    selectedStreams,
    anomalies,
  ]);

  return (
    <div className={"flex-1 rounded-sm min-h-20 h-full relative"}>
      <LegendButton dimensions={dimensions}>
        <VegaChart
          spec={spec}
          actions={false}
          className={cn(
            className,
            "w-full h-full flex flex-1",
            "rounded-sm min-h-20 h-full"
          )}
        />
      </LegendButton>
    </div>
  );
};

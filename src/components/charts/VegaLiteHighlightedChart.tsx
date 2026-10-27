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
    // Each layer folds only the streams it draws. (Folding all streams at
    // the top level and the highlighted streams again inside a layer created
    // rows x streams x highlighted-streams tuples on every update, which
    // exhausted memory with ~200 streams.)
    const yEncoding = (field: string) => ({
      field,
      type: "quantitative" as const,
      title: null,
      scale: { domain: yDomain },
      axis: {
        tickColor: { condition: { value: chartColor, test: "true" }, value: chartColor },
        gridColor: chartColor,
        gridOpacity: 0.1,
        domainColor: chartColor,
        labelPadding: -20,
        labelOpacity: 0.5,
        ticks: false,
        domain: false,
      },
    });

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
      encoding: {
        x: {
          field: "timestamp",
          type: !!saveScreenSpace ? "ordinal" : "temporal",
          title: null,
          axis: {
            ...(saveScreenSpace ? { labelExpr: "" } : {}),
            tickColor: { condition: { value: chartColor, test: "true" }, value: chartColor },
            gridColor: chartColor,
            gridOpacity: 0.1,
            domainColor: chartColor,
          },
        },
      },
      layer: [
        // Envelope: min-max band across all streams of the cluster.
        {
          transform: [
            { fold: dimensions, as: ["variable", "value"] },
            {
              aggregate: [
                { op: "max", field: "value", as: "max_value" },
                { op: "min", field: "value", as: "min_value" },
              ],
              groupby: ["timestamp"],
            },
          ],
          mark: { type: "area", color: chartColor, opacity: 0.3 },
          encoding: {
            y: yEncoding("min_value"),
            y2: { field: "max_value" },
          },
        },

        // Streams that recently joined the cluster, drawn in the colour of
        // the cluster they came from and fading out over the history depth.
        ...(highlightInfo?.length
          ? [
              {
                transform: [
                  {
                    fold: highlightInfo.map(({ dimension }) => dimension),
                    as: ["variable", "value"] as [string, string],
                  },
                ],
                mark: { type: "line" },
                encoding: {
                  y: yEncoding("value"),
                  color: {
                    field: "variable",
                    type: "nominal",
                    legend: null,
                    condition: highlightInfo.map(({ dimension, lastDimension }) => ({
                      test: `datum.variable === '${escapeVegaString(dimension)}'`,
                      value:
                        lastDimension !== undefined
                          ? colorForClusterId(lastDimension)
                          : "gray",
                    })),
                  },
                  opacity: {
                    condition: highlightInfo.map(({ dimension, opacity }) => ({
                      test: `datum.variable === '${escapeVegaString(dimension)}'`,
                      value: dimensions.length < 3 ? 1.0 : opacity,
                    })),
                    value: 0.3,
                  },
                },
              } as UnitSpec<string>,
            ]
          : []),

        // Streams selected in the cluster legend: black line plus label.
        ...selectedStreams
          .filter((value) => dimensions.includes(value))
          .flatMap((value) => [
            {
              transform: [{ fold: [value], as: ["variable", "value"] }],
              mark: { type: "line", color: "black" },
              encoding: { y: yEncoding("value") },
            } as UnitSpec<string>,
            {
              transform: [{ fold: [value], as: ["variable", "value"] }],
              mark: { type: "text", align: "right", dy: -5 },
              encoding: {
                x: { field: "timestamp", type: "temporal", aggregate: "max" },
                y: { field: "value", type: "quantitative", aggregate: "max" },
                text: { value },
              },
            } as UnitSpec<string>,
          ]),

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

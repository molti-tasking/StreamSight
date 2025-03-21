import { cn } from "@/lib/utils";
import { VegaLite, type VisualizationSpec } from "react-vega";
import { clusterColors } from "../clusterColors";
import { ChartProps } from "./ChartProps";
import { useStreamSelectionStore } from "@/store/useStreamSelectionStore";
import { UnitSpec } from "vega-lite/build/src/spec";
import { LegendButton } from "./LegendButton";

export const VegaLiteHighlightedChart = ({
  values,
  chartColor,
  yDomain,
  saveScreenSpace,
  className,
  highlightInfo,
}: ChartProps & {
  highlightInfo?: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[];
  chartColor: string;
}) => {
  const selectedStreams = useStreamSelectionStore((state) => state.values);
  const dimensions: string[] = values.length
    ? Object.keys(values[0]).filter((e) => e !== "timestamp")
    : [];
  let spec: VisualizationSpec;

  if (values?.[0] && Object.keys(values[0]).length === 2) {
    spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
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
        color: {
          legend: null,
        },
      },
    };
  } else {
    spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",

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
                    ? clusterColors[lastDimension % clusterColors.length]
                    : "gray";
                return {
                  test: `datum.variable === '${dimension}'`,
                  value: clusterColor, // Use the color property from highlightInfo
                };
              }),
            },

            opacity: {
              condition: highlightInfo?.map(({ dimension, opacity }) => ({
                test: `datum.variable === '${dimension}'`,
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

        ...selectedStreams?.flatMap((value) => [
          {
            mark: "line",
            encoding: {
              y: { field: "value", type: "quantitative" },
              color: {
                field: "variable",
                type: "nominal",
                legend: null,
                condition: {
                  test: `datum.variable === '${value}'`,
                  value: "black",
                },
              },
              opacity: {
                condition: {
                  test: `datum.variable === '${value}'`,
                  value: 1,
                },
                value: 0,
              },
            },
          } as UnitSpec<"line">,
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
            transform: [{ filter: `datum.variable === '${value}'` }],
          } as UnitSpec<"text">,
        ]),
      ],
    };
  }
  return (
    <div className={"flex-1 rounded-sm  min-h-20 h-full relative"}>
      <div className="absolute top-2 right-2 z-40">
        <LegendButton dimensions={dimensions} />
      </div>
      <VegaLite
        spec={spec}
        actions={false}
        className={cn(
          className,
          "w-full h-full flex flex-1",
          "rounded-sm   min-h-20 h-full"
        )}
      />
    </div>
  );
};

import { cn } from "@/lib/utils";
import { useExploratoryStore } from "@/store/useExploratoryStore";
import { VegaLite, type VisualizationSpec } from "react-vega";
import { clusterColors } from "../clusterColors";
import { ChartProps } from "./ChartProps";

export const VegaLiteHighlightedChart = ({
  values,
  chartColor,
  yDomain,
  saveScreenSpace,
  highlightInfo,
}: ChartProps & {
  highlightInfo?: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[];
  chartColor: string;
}) => {
  const dimensions: string[] = values.length
    ? Object.keys(values[0]).filter((e) => e !== "timestamp")
    : [];

  const spec: VisualizationSpec = {
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
              gridOpacity: 0.3,
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
              gridOpacity: 0.3,
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
    ],
  };

  const isSelecting = useExploratoryStore((state) => state.isSelecting);
  const addDataIdeaEvent = useExploratoryStore(
    (state) => state.addDataIdeaEvent
  );

  return (
    <div
      onClick={() =>
        isSelecting &&
        addDataIdeaEvent({
          vegaLiteSpec: spec,
        })
      }
      className={cn(
        "flex-1",
        "rounded-sm overflow-hidden min-h-20 h-full",
        isSelecting
          ? "hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-lg rounded-lg transition-all duration-300"
          : ""
      )}
    >
      <VegaLite
        spec={spec}
        style={{ cursor: isSelecting ? "grab" : "initial" }}
        actions={false}
        className={cn(
          "w-full h-full flex flex-1",
          "rounded-sm overflow-hidden min-h-20 h-full"
        )}
      />
    </div>
  );
};

import { useRawDataStore } from "@/store/useRawDataStore";
import { VegaLite, type VisualizationSpec } from "react-vega";

export const AggregatedLineChart = () => {
  const dimensions = useRawDataStore((state) => state.dimensions);
  const values = useRawDataStore((state) => state.values);

  const spec: VisualizationSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: "container",
    height: "container",
    data: {
      values,
    },
    transform: [
      {
        fold: dimensions,
        as: ["variable", "value"],
      },
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
  };

  return (
    <VegaLite spec={spec} actions={false} className="container w-full mt-2" />
  );
};

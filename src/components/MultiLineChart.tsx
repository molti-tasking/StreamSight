import { useRawDataStore } from "@/store/useRawDataStore";
import { VegaLite, type VisualizationSpec } from "react-vega";

export const MultiLineChart = () => {
  const dimensions = useRawDataStore((state) => state.dimensions);
  const values = useRawDataStore((state) => state.values);
  const times = values
    .map((v) => v["timestamp"])
    .filter((_, index) => index % 5 === 0);
  console.log(times);

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
      // {
      //   calculate: "toNumber(datum.value)",
      //   as: "value",
      // },
      // {
      //   calculate: "toNumber(datum.timestamp)",
      //   as: "timestamp",
      // },
    ],
    mark: "line",
    encoding: {
      x: {
        field: "timestamp",
        // type: "ordinal",
        // timeUnit: "milliseconds",
        // bandPosition: 0,
        axis: {
          values: times,

          // title: "",
          tickCount: times.length,

          // format: "%Y-%m-%d",
          // labelAlign: "left",
          // labelExpr:
          //   "[timeFormat(datum.value, '%b'), timeFormat(datum.value, '%d') == '01' ? timeFormat(datum.value, '%Y') : '']",
          // labelOffset: 4,
          // grid: true,
          // labelPadding: {
          //   expr: "timeFormat(datum.value, '%d') == '01' ? -26:-11",
          // },
          // tickSize: { expr: "timeFormat(datum.value, '%d') == '01' ? 30:15" },
          // gridDash: {
          //   expr: "timeFormat(datum.value, '%d') == '01' ? []:[2,2]",
          // },
          // tickDash: {
          // expr: "timeFormat(datum.value, '%d') == '01' ? []:[2,2]",
          // },
          // tickColor: {
          //   expr: "timeFormat(datum.value, '%d') == '01' ? '#0564C8':'silver'",
          // },
          // gridColor: {
          //   expr: "timeFormat(datum.value, '%d') == '01' ? '#0564C8':'silver'",
          // },
        },

        // field: "timestamp",
        type: "temporal",
        title: "Time",
        // axis: {
        //   labelExpr: "datum.label % 2 === 0 ? datum.label : datum.label",
        //   labelColor: {
        //     expr: `indexof(${times.toString()}, datum.label) ? 'blue' : 'red'`, //"datum.value % 3 === 0 ? 'blue' : 'red'",
        //   },
        // },
        // scale: {
        //   domain: times,
        // },
      },
      y: {
        field: "value",
        type: "quantitative",
        title: "Value",
      },
      color: {
        field: "variable",
        type: "nominal",
        title: "Variables",
      },
    },
  };

  return (
    <VegaLite spec={spec} actions={false} className="container w-full mt-2" />
  );
};

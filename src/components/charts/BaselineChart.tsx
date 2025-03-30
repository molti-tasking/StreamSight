import { cn } from "@/lib/utils";
import { useRawDataStore } from "@/store/useRawDataStore";
import dynamic from "next/dynamic";
import { VisualizationSpec } from "react-vega";
const VegaLite = dynamic(() => import("react-vega").then((m) => m.VegaLite), {
  ssr: false,
});
export const BaselineChart = () => {
  const rawData = useRawDataStore((state) => state.values);
  const dimensions = useRawDataStore((state) => state.dimensions);
  if (rawData.length < 3) {
    return <p>Not enough data collected yet.</p>;
  }
  const baseline = rawData[0];
  const history = [
    rawData[rawData.length - 1],
    rawData[rawData.length - 2],
    rawData[rawData.length - 3],
    rawData[rawData.length - 4],
    rawData[rawData.length - 5],
  ];

  const values = history.map((dataSet) =>
    dimensions.reduce(
      (prev, dim) => ({
        ...prev,
        [dim]: dataSet[dim] - baseline[dim],
      }),
      {}
    )
  );

  const spec: VisualizationSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: { values },
    width: "container",
    height: "container",
    background: "transparent",
    transform: [
      { window: [{ op: "count", as: "index" }] },
      { fold: dimensions },
      {
        joinaggregate: [
          { op: "min", field: "value", as: "min" },
          { op: "max", field: "value", as: "max" },
        ],
        groupby: ["key"],
      },
      {
        calculate: "(datum.value - datum.min) / (datum.max-datum.min)",
        as: "norm_val",
      },
      {
        calculate: "(datum.min + datum.max) / 2",
        as: "mid",
      },
    ],
    layer: [
      {
        mark: { type: "rule", color: "#ccc" },
        encoding: {
          detail: { aggregate: "count" },
          x: { field: "key" },
        },
      },
      {
        mark: "line",
        encoding: {
          detail: { type: "nominal", field: "index" },
          opacity: { value: 0.3 },
          x: { type: "nominal", field: "key" },
          y: { type: "quantitative", field: "norm_val", axis: null },
        },
      },
      {
        encoding: {
          x: { type: "nominal", field: "key" },
          y: { value: 0 },
        },
        layer: [
          {
            mark: { type: "text", style: "label" },
            encoding: {
              text: { aggregate: "max", field: "max" },
            },
          },
          {
            mark: { type: "tick", style: "tick", size: 8, color: "#ccc" },
          },
        ],
      },
      {
        encoding: {
          x: { type: "nominal", field: "key" },
          y: { value: 150 },
        },
        layer: [
          {
            mark: { type: "text", style: "label" },
            encoding: {
              text: { aggregate: "min", field: "mid" },
            },
          },
          {
            mark: { type: "tick", style: "tick", size: 8, color: "#ccc" },
          },
        ],
      },
      {
        encoding: {
          x: { type: "nominal", field: "key" },
          y: { value: 300 },
        },
        layer: [
          {
            mark: { type: "text", style: "label" },
            encoding: {
              text: { aggregate: "min", field: "min" },
            },
          },
          {
            mark: { type: "tick", style: "tick", size: 8, color: "#ccc" },
          },
        ],
      },
    ],
    config: {
      axisX: { domain: false, labelAngle: 0, tickColor: "#ccc", title: null },
      view: { stroke: null },
      style: {
        label: { baseline: "middle", align: "right", dx: -5 },
        tick: { orient: "horizontal" },
      },
    },
  };
  return (
    <div className="flex-1 flex flex-col gap-2 overflow-scroll">
      <VegaLite
        spec={spec}
        actions={false}
        style={{ cursor: "pointer" }}
        className={cn(
          "w-full h-full flex flex-1",
          "rounded-sm overflow-hidden min-h-20 h-full"
        )}
      />
    </div>
  );
};

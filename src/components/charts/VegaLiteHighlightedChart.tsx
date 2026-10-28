import { cn } from "@/lib/utils";
import type { VisualizationSpec } from "vega-embed";
import { VegaChart, VL_SCHEMA } from "@/components/charts/VegaChart";
import { colorForClusterId, OUTLIER_COLOR } from "../clusterColors";
import { ChartProps } from "./ChartProps";
import { useStreamSelectionStore } from "@/store/useStreamSelectionStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { LegendButton } from "./LegendButton";
import { useMemo } from "react";
import { useTimeAxis } from "./useTimeAxis";
import { anomalyLayers } from "./anomalyLayers";

/** Pulls the stream name out of a Vega-Lite point-selection signal value. */
const selectedStream = (value: unknown): string | undefined => {
  const field = (value as { variable?: unknown } | null)?.variable;
  const first = Array.isArray(field) ? field[0] : field;
  return typeof first === "string" ? first : undefined;
};

/**
 * The default cluster chart: an envelope (min-max across the cluster's
 * streams), streams that recently joined the cluster (dashed, in the colour
 * of the cluster they came from, fading out), streams selected anywhere in
 * the app (black, labelled), and anomaly markers.
 *
 * The Vega-Lite spec only depends on the chart's appearance, not on the
 * data: values, highlights, selection and scale domains are pushed into the
 * live view as datasets and params. A streaming tick therefore updates the
 * existing view instead of rebuilding it (see VegaChart).
 */
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
  const selected = useStreamSelectionStore((state) => state.values);
  const setHovered = useStreamSelectionStore((state) => state.setHovered);
  const togglePinned = useStreamSelectionStore((state) => state.togglePinned);
  const showStreamLabel = useStreamClustersSettingsStore((s) => s.showStreamLabel);
  const timeAxis = useTimeAxis();

  const dimensions: string[] = useMemo(() => {
    const keys = new Set<string>();
    for (const row of values) for (const key in row) if (key !== "timestamp") keys.add(key);
    return [...keys];
  }, [values]);

  // Long format: one tuple per stream and tick.
  const long = useMemo(
    () =>
      values.flatMap((row) =>
        dimensions.flatMap((variable) =>
          Number.isFinite(row[variable])
            ? [{ timestamp: row.timestamp, variable, value: row[variable] }]
            : []
        )
      ),
    [values, dimensions]
  );
  const highlights = useMemo(
    () =>
      (highlightInfo ?? []).map(({ dimension, opacity, lastDimension }) => ({
        variable: dimension,
        hlColor: lastDimension !== undefined ? colorForClusterId(lastDimension) : OUTLIER_COLOR,
        hlOpacity: dimensions.length < 3 ? 1 : opacity,
      })),
    [highlightInfo, dimensions.length]
  );
  const selection = useMemo(
    () => selected.filter((s) => dimensions.includes(s)).map((variable) => ({ variable })),
    [selected, dimensions]
  );
  const small = dimensions.length <= 3;

  const spec: VisualizationSpec = useMemo(() => {
    const yAxis = {
      title: null,
      tickColor: { condition: { value: chartColor, test: "true" }, value: chartColor },
      gridColor: chartColor,
      gridOpacity: 0.1,
      domainColor: chartColor,
      labelPadding: -20,
      labelOpacity: 0.5,
      ticks: false,
      domain: false,
    };
    const y = (field: string) => ({
      field,
      type: "quantitative" as const,
      scale: { domain: { expr: "[ymin, ymax]" } },
      axis: yAxis,
    });
    const isSelected = [
      { lookup: "variable", from: { data: { values: selection }, key: "variable", fields: ["variable"] }, as: ["isSelected"] },
      { filter: "datum.isSelected != null" },
    ];
    return {
      $schema: VL_SCHEMA,
      padding: 0,
      width: "container",
      height: "container",
      background: "transparent",
      autosize: { type: "fit", contains: "padding" },
      params: [
        { name: "xmin", value: 0 },
        { name: "xmax", value: 1 },
        { name: "ymin", value: 0 },
        { name: "ymax", value: 1 },
      ],
      data: { values: long },
      encoding: {
        x: {
          field: "timestamp",
          type: saveScreenSpace ? "ordinal" : "temporal",
          ...(saveScreenSpace
            ? {}
            : { scale: { type: timeAxis.scale.type, domain: { expr: "[xmin, xmax]" } } }),
          axis: {
            ...(saveScreenSpace ? { labelExpr: "", title: null } : timeAxis.axis),
            tickColor: { condition: { value: chartColor, test: "true" }, value: chartColor },
            gridColor: chartColor,
            gridOpacity: 0.1,
            domainColor: chartColor,
          },
        },
      },
      layer: [
        // Envelope: min-max band across the cluster's streams.
        {
          transform: [
            {
              aggregate: [
                { op: "max", field: "value", as: "max_value" },
                { op: "min", field: "value", as: "min_value" },
              ],
              groupby: ["timestamp"],
            },
          ],
          mark: { type: "area", color: chartColor, opacity: 0.3 },
          encoding: { y: y("min_value"), y2: { field: "max_value" } },
        },
        // Small clusters: every member as a thin line.
        ...(small
          ? [
              {
                mark: { type: "line" as const, color: chartColor, strokeWidth: 1 },
                encoding: { y: y("value"), detail: { field: "variable" } },
              },
            ]
          : []),
        // Streams that recently joined: dashed, in their previous cluster's
        // colour (stroke and colour both differ from the envelope).
        {
          transform: [
            {
              lookup: "variable",
              from: { data: { values: highlights }, key: "variable", fields: ["hlColor", "hlOpacity"] },
            },
            { filter: "datum.hlColor != null" },
          ],
          mark: { type: "line", strokeDash: [5, 3], strokeWidth: 1.5 },
          encoding: {
            y: y("value"),
            detail: { field: "variable" },
            color: { field: "hlColor", type: "nominal", scale: null, legend: null },
            opacity: { field: "hlOpacity", type: "quantitative", scale: null, legend: null },
          },
        },
        // Streams hovered or pinned anywhere in the app: black, labelled.
        {
          transform: isSelected,
          mark: { type: "line", color: "black", strokeWidth: 2 },
          encoding: { y: y("value"), detail: { field: "variable" } },
        },
        ...(showStreamLabel
          ? [
              {
                transform: [
                  ...isSelected,
                  { joinaggregate: [{ op: "max" as const, field: "timestamp", as: "lastTimestamp" }], groupby: ["variable"] },
                  { filter: "datum.timestamp === datum.lastTimestamp" },
                ],
                mark: { type: "text" as const, align: "right" as const, dy: -6, fontWeight: "bold" as const },
                encoding: { y: y("value"), text: { field: "variable" } },
              },
            ]
          : []),
        // Pointer interaction: the nearest stream point is "hovered"; a click
        // pins it. Invisible, but present for every member.
        {
          params: [
            {
              name: "hover",
              select: { type: "point", on: "pointermove", nearest: true, fields: ["variable"], clear: "pointerout" },
            },
            { name: "pick", select: { type: "point", on: "click", nearest: true, fields: ["variable"] } },
          ],
          mark: { type: "point", opacity: 0, size: 30 },
          encoding: { y: y("value"), tooltip: [{ field: "variable", title: "stream" }] },
        },
        ...anomalyLayers(anomalies?.length ? anomalies : [{ timestamp: NaN, label: "" }]),
      ],
    } as VisualizationSpec;
  }, [long, chartColor, saveScreenSpace, highlights, selection, anomalies, timeAxis.scale.type, timeAxis.axis, small, showStreamLabel]);

  const params = useMemo(
    () => ({ xmin: timeAxis.domain[0], xmax: timeAxis.domain[1], ymin: yDomain[0], ymax: yDomain[1] }),
    [timeAxis.domain, yDomain]
  );
  const signals = useMemo(
    () => ({
      hover: (_: string, value: unknown) => setHovered(selectedStream(value)),
      pick: (_: string, value: unknown) => {
        const stream = selectedStream(value);
        if (stream) togglePinned(stream);
      },
    }),
    [setHovered, togglePinned]
  );

  return (
    <div className={"flex-1 rounded-sm min-h-20 h-full relative"}>
      <LegendButton dimensions={dimensions}>
        <VegaChart
          spec={spec}
          params={params}
          signals={signals}
          actions={false}
          className={cn(className, "w-full h-full flex flex-1", "rounded-sm min-h-20 h-full")}
        />
      </LegendButton>
    </div>
  );
};

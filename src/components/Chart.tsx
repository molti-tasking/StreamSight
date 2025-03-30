"use client";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { PlotlyChart } from "./charts/PlotlyChart";
import { VegaLiteChart } from "./charts/VegaLiteChart";
import { VegaLiteHighlightedChart } from "./charts/VegaLiteHighlightedChart";

export const Chart = ({
  values,
  chartColor,
  className,
  highlightInfo,
}: {
  values: Record<string, number>[];
  chartColor: string;
  className: string;
  highlightInfo?: {
    dimension: string;
    opacity: number;
    lastDimension: number | undefined;
  }[];
}) => {
  const yDomain = useViewModelStore((state) => state.yDomain);
  const mode = useStreamClustersSettingsStore((state) => state.chartMode);
  const baselineValues = useStreamClustersSettingsStore(
    (state) => state.baselineValues
  );

  if (mode === "plotly") {
    return (
      <PlotlyChart
        values={values}
        className={className}
        yDomain={yDomain}
        mode={mode}
      />
    );
  } else if (mode === "highlighted") {
    return (
      <VegaLiteHighlightedChart
        values={values}
        yDomain={yDomain}
        className={className}
        mode={mode}
        highlightInfo={highlightInfo}
        chartColor={chartColor}
      />
    );
  }

  return (
    <VegaLiteChart
      baselineValues={baselineValues}
      values={values}
      className={className}
      yDomain={yDomain}
      mode={mode}
    />
  );
};

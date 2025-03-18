"use client";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { PlotlyChart } from "./charts/PlotlyChart";
import { VegaLiteHighlightedChart } from "./charts/VegaLiteHighlightedChart";
import { VegaLiteChart } from "./charts/VegaLiteChart";

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
  const saveScreenSpace = useClusterProcessingSettingsStore(
    (state) => "saveScreenSpace" in state && state.saveScreenSpace
  );
  if (mode === "plotly") {
    return (
      <PlotlyChart
        values={values}
        className={className}
        yDomain={yDomain}
        mode={mode}
        saveScreenSpace={saveScreenSpace}
      />
    );
  } else if (mode === "highlighted") {
    return (
      <VegaLiteHighlightedChart
        values={values}
        yDomain={yDomain}
        className={className}
        mode={mode}
        saveScreenSpace={saveScreenSpace}
        highlightInfo={highlightInfo}
        chartColor={chartColor}
      />
    );
  }

  return (
    <VegaLiteChart
      values={values}
      className={className}
      yDomain={yDomain}
      mode={mode}
      saveScreenSpace={saveScreenSpace}
    />
  );
};

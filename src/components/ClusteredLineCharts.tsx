import { cn } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { AlertCircleIcon } from "lucide-react";
import { memo } from "react";
import { PlotlyChart } from "./charts/PlotlyChart";
import { VegaLiteChart } from "./charts/VegaLiteChart";
import { VegaLiteHighlightedChart } from "./charts/VegaLiteHighlightedChart";
import { clusterColors } from "./clusterColors";

export const ClusteredLineChartList = () => {
  return (
    <div className="flex-1 flex flex-col gap-2 overflow-scroll">
      <Charts />
    </div>
  );
};

export const ClusteredLineChartGrid = () => {
  // const ref = useRef<HTMLDivElement>(null);
  // const { height, width } = useContainerDimensions(ref);

  const aggregated = useViewModelStore((state) => state.aggregated);
  const amountOfCharts = aggregated.length;

  const gridCols = Math.floor(Math.sqrt(amountOfCharts));

  // Now we need to calculate best amount of columns that we want to have...
  return (
    <div
      // ref={ref}
      className={cn("flex-1 grid gap-0.5 overflow-scroll auto-rows-fr")}
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      <Charts />
    </div>
  );
};

const Charts = memo(() => {
  /**
   * This is a list of entries that again are a list of multiple values representing a multiline chart. So this data should be used to render multiple Muli-Line-Charts
   *
   * It can be more than 30 charts that are getting updated every second.
   */
  const aggregated = useViewModelStore((state) => state.aggregated);
  const highlightInfo = useViewModelStore((state) => state.highlightInfo);
  const yDomain = useViewModelStore((state) => state.yDomain);
  const mode = useStreamClustersSettingsStore((state) => state.chartMode);
  const saveScreenSpace = useClusterProcessingSettingsStore(
    (state) => "saveScreenSpace" in state && state.saveScreenSpace
  );
  if (mode === "plotly") {
    // From plotly docs: https://plotly.com/python/webgl-vs-svg/

    //// Context limits: browsers impose a strict limit on the number of WebGL "contexts" that any given web document can access.
    //// WebGL-powered traces in plotly can use multiple contexts in some cases but as a general rule, it may not be possible to
    //// render more than 8 WebGL-involving figures on the same page at the same time.

    // So we are going to only render the first 8 ones :-(
    const plotlyMaxNumberOfPlots = 8;

    if (aggregated.length > plotlyMaxNumberOfPlots) {
      return (
        <>
          {aggregated.slice(0, plotlyMaxNumberOfPlots).map((val, index) => (
            <PlotlyChart
              values={val}
              key={index}
              className={clusterColors[index % clusterColors.length]}
              yDomain={yDomain}
              mode={mode}
              saveScreenSpace={saveScreenSpace}
            />
          ))}
          <div className="bg-orange-400 p-4 mt-2 rounded-md flex flex-row items-center gap-4 text-white">
            <AlertCircleIcon />
            <span>
              There are {aggregated.length - plotlyMaxNumberOfPlots} more
              clusters, that are not shown.
            </span>
          </div>
        </>
      );
    }
    return (
      <>
        {aggregated.map((val, index) => (
          <PlotlyChart
            values={val}
            key={index}
            className={clusterColors[index % clusterColors.length]}
            yDomain={yDomain}
            mode={mode}
            saveScreenSpace={saveScreenSpace}
          />
        ))}
      </>
    );
  } else if (mode === "highlighted") {
    return (
      <>
        {aggregated.map((val, index) => (
          <VegaLiteHighlightedChart
            values={val}
            key={index}
            className={""}
            yDomain={yDomain}
            mode={mode}
            saveScreenSpace={saveScreenSpace}
            highlightInfo={highlightInfo?.[index]}
            chartColor={clusterColors[index % clusterColors.length]}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {aggregated.map((val, index) => (
        <VegaLiteChart
          values={val}
          key={index}
          className={clusterColors[index % clusterColors.length]}
          yDomain={yDomain}
          mode={mode}
          saveScreenSpace={saveScreenSpace}
        />
      ))}
    </>
  );
});

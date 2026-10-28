import { cn } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { CircleAlertIcon } from "lucide-react";
import { memo } from "react";
import { PlotlyChart } from "./charts/PlotlyChart";
import { colorForClusterId } from "./clusterColors";
import { Chart } from "./Chart";
import { clusterTransitionName } from "@/lib/viewTransition";

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
  const clusterIds = useViewModelStore((state) => state.clusterIds);
  const highlightInfo = useViewModelStore((state) => state.highlightInfo);
  const anomalies = useViewModelStore((state) => state.anomalies);
  const yDomain = useViewModelStore((state) => state.yDomain);
  const mode = useStreamClustersSettingsStore((state) => state.chartMode);

  // Color by stable cluster id so a cluster keeps its color across ticks.
  const colorFor = (index: number) =>
    colorForClusterId(clusterIds[index] ?? index);

  // Anomalies belonging to the cluster rendered at this position.
  const anomaliesFor = (index: number) =>
    anomalies
      .filter((a) => a.clusterId === (clusterIds[index] ?? index))
      .map((a) => ({ timestamp: a.timestamp, label: a.label }));
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
              className={colorFor(index)}
              yDomain={yDomain}
              mode={mode}
              saveScreenSpace={saveScreenSpace}
            />
          ))}
          <div className="bg-orange-400 p-4 mt-2 rounded-md flex flex-row items-center gap-4 text-white">
            <CircleAlertIcon />
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
            className={colorFor(index)}
            yDomain={yDomain}
            mode={mode}
            saveScreenSpace={saveScreenSpace}
          />
        ))}
      </>
    );
  }

  // Keyed by stable cluster id: a cluster keeps its chart (no remount) when
  // other clusters appear or disappear, and morphs between layouts.
  return (
    <>
      {aggregated.map((val, index) => {
        const id = clusterIds[index] ?? index;
        return (
          <div
            key={id}
            className="flex flex-1 min-h-20 min-w-0"
            style={{ viewTransitionName: clusterTransitionName(id) }}
          >
            <Chart
              values={val}
              className=""
              chartColor={colorFor(index)}
              highlightInfo={highlightInfo?.[index]}
              anomalies={anomaliesFor(index)}
            />
          </div>
        );
      })}
    </>
  );
});

Charts.displayName = "Charts";

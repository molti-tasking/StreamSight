import { cn } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useTemporalNavigationStore } from "@/store/useTemporalNavigationStore";
import { timeFormat, utcFormat } from "d3";
import { timeAxisFormat } from "@/lib/timeAxis";
import { useTimeAxisKind } from "./charts/useTimeAxis";
import { useEffect, useMemo } from "react";
import { clusterColors, OUTLIER_COLOR } from "./clusterColors";
import { ColorSlots } from "@/lib/clustering/colorSlots";

export const AggregatedClusterView = () => {
  const values = useRawDataStore((state) => state.values);
  const dimensions = useRawDataStore((state) => state.dimensions);

  // Subscribe with selectors so this view only re-renders on the inputs it
  // actually uses, instead of on every unrelated store change.
  const presentationSettings = useClusterProcessingSettingsStore();
  const animate = useStreamClustersSettingsStore(
    (state) => state.animateTransitions
  );
  const allClustersInTime = useViewModelStore((state) => state.clustersInTime);
  // Focus view: when a range is selected on the timeline, show only it.
  const navMode = useTemporalNavigationStore((s) => s.mode);
  const rangeFrom = useTemporalNavigationStore((s) => s.from);
  const rangeTo = useTemporalNavigationStore((s) => s.to);
  const clustersInTime = useMemo(
    () =>
      navMode === "range" && rangeFrom !== undefined && rangeTo !== undefined
        ? allClustersInTime.filter((c) => {
            const t = Number(c.timestamp);
            return t >= rangeFrom && t <= rangeTo;
          })
        : allClustersInTime,
    [allClustersInTime, navMode, rangeFrom, rangeTo]
  );
  const anomalyLog = useViewModelStore((state) => state.anomalyLog);
  // Anomalies by row timestamp, for markers above the columns.
  const anomaliesAt = useMemo(() => {
    const byTime = new Map<string, string[]>();
    for (const a of anomalyLog) {
      const key = String(a.timestamp);
      byTime.set(key, [...(byTime.get(key) ?? []), a.label]);
    }
    return byTime;
  }, [anomalyLog]);
  // Colours: palette slots assigned along the time axis, so clusters that
  // exist in the same column never share a colour (up to 8).
  const cellColors = useMemo(() => {
    const slots = new ColorSlots(clusterColors.length);
    return clustersInTime.map(({ clusters }) => {
      slots.update(clusters.map(([, id]) => id));
      return clusters.map(([, id]) => (id < 0 ? OUTLIER_COLOR : clusterColors[slots.slotOf(id)]));
    });
  }, [clustersInTime]);
  const processClustersInTimeData = useViewModelStore(
    (state) => state.processClustersInTimeData
  );

  useEffect(() => {
    processClustersInTimeData();
  }, [presentationSettings, values, processClustersInTimeData]);

  const timeAxisKind = useTimeAxisKind();
  const axisFormat = useMemo(() => {
    const first = Number(clustersInTime[0]?.timestamp ?? 0);
    const last = Number(clustersInTime[clustersInTime.length - 1]?.timestamp ?? 0);
    return timeAxisFormat(timeAxisKind, last - first);
  }, [timeAxisKind, clustersInTime]);
  const formatTime = useMemo(
    () => (axisFormat.utc ? utcFormat : timeFormat)(axisFormat.format),
    [axisFormat]
  );

  const interestingTimestampIndizes = useMemo(
    () => [
      0,
      Math.floor(clustersInTime.length / 4),
      Math.floor(clustersInTime.length / 2),
      Math.floor((clustersInTime.length * 3) / 4),
      clustersInTime.length - 1,
    ],
    [clustersInTime.length]
  );

  return (
    <div className="flex flex-1 flex-row w-full my-2 pb-6 relative">
      <div
        className={cn(
          "flex flex-col items-center overflow-hidden min-w-6 max-w-16 pr-1"
        )}
      >
        {dimensions.map((name, groupIndex) => (
          <div
            key={`${groupIndex}-${name}`}
            className={cn(
              "flex-1 w-full",
              "text-[6px] text-ellipsis overflow-hidden whitespace-nowrap",
              "flex items-center",
              groupIndex > 0 ? "border-t-[0.5px] border-white" : ""
            )}
          >
            {name}
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-row w-full">
        {clustersInTime.map(({ timestamp, clusters }, groupIndex) => (
          <div
            key={`${groupIndex}-${timestamp}`}
            className={cn(
              "flex flex-1 flex-col shrink items-center overflow-hidden ",
              "relative",
              groupIndex > 0 ? "border-l-[0.5px] border-white" : "rounded-l-sm"
            )}
          >
            {anomaliesAt.has(String(timestamp)) && (
              <div
                className="absolute -top-3 text-[10px] leading-none text-gray-900"
                title={anomaliesAt.get(String(timestamp))!.join("\n")}
                aria-label="Anomaly"
              >
                ▼
              </div>
            )}
            {clusters.map(([name], clusterIndex) => (
              <div
                key={`${groupIndex}-${clusterIndex}-${name}`}
                style={{ background: cellColors[groupIndex]?.[clusterIndex] }}
                className={cn(
                  "flex-1 min-w-1 w-full",
                  animate && "transition-colors duration-700",
                  clusterIndex > 0 ? "border-t-[0.5px] border-green" : ""
                )}
              ></div>
            ))}

            {!!interestingTimestampIndizes.includes(groupIndex) && (
              <div
                className={cn(
                  "overflow-visible absolute",
                  "bottom-0",
                  "h-8 p-2 rounded-sm text-xs"
                )}
              >
                {formatTime(new Date(Number(timestamp)))}
                {groupIndex === 0 && (
                  <span className="text-muted-foreground"> ({axisFormat.title})</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


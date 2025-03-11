import { cn } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { timeFormat } from "d3";
import { useEffect } from "react";
import { clusterColors } from "./clusterColors";

export const AggregatedClusterView = () => {
  const values = useRawDataStore((state) => state.values);
  const dimensions = useRawDataStore((state) => state.dimensions);

  const presentationSettings = useClusterProcessingSettingsStore();

  const { clustersInTime, processClustersInTimeData } = useViewModelStore();

  useEffect(() => {
    processClustersInTimeData();
  }, [presentationSettings, values]);
  const interestingTimestampIndizes = [
    0,
    Math.floor(clustersInTime.length / 4),
    Math.floor(clustersInTime.length / 2),
    Math.floor((clustersInTime.length * 3) / 4),
    clustersInTime.length - 1,
  ];

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
              "flex flex-1 flex-col flex-shrink items-center overflow-hidden ",
              groupIndex > 0 ? "border-l-[0.5px] border-white" : "rounded-l-sm"
            )}
          >
            {clusters.map(([name, styleGroup], clusterIndex) => (
              <div
                key={`${groupIndex}-${clusterIndex}-${name}`}
                className={cn(
                  clusterColors[styleGroup % clusterColors.length],
                  "flex-1 min-w-1 w-full",
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
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const formatTime = timeFormat("%d.%m.%y %H:%M");

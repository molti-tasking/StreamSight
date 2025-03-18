import { cn } from "@/lib/utils";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useState } from "react";
import { clusterColors } from "./clusterColors";
import { useStreamSelectionStore } from "@/store/useStreamSelectionStore";

export const ClusterLegend = () => {
  const clusterAssignment = useViewModelStore(
    (state) => state.clusterAssignment
  );
  const clusterAssignmentOrientation = useStreamClustersSettingsStore(
    (store) => store.clusterAssignmentOrientation
  );

  const [showHistory, setShowHistory] = useState<boolean>(false);

  return (
    <div
      className={cn(
        "flex gap-1 cursor-pointer",
        clusterAssignmentOrientation === "horizontal"
          ? "flex-row w-full"
          : "flex-col h-full"
      )}
      onClick={() => setShowHistory((currValue) => !currValue)}
    >
      {showHistory ? (
        <HistoryBars />
      ) : (
        <div
          className={cn(
            "rounded-sm overflow-hidden opacity-70",
            clusterAssignmentOrientation === "horizontal" ? "w-full" : "h-full"
          )}
          key={"single-legend-bar"}
        >
          <LegendBar entries={clusterAssignment} />
        </div>
      )}
    </div>
  );
};

const HistoryBars = () => {
  const clusterAssignmentHistoryDepth = useStreamClustersSettingsStore(
    (state) => state.clusterAssignmentHistoryDepth
  );
  const clusterAssignmentHistory = useViewModelStore(
    (state) => state.clusterAssignmentHistory
  ).slice(0, clusterAssignmentHistoryDepth);
  const clusterAssignmentOrientation = useStreamClustersSettingsStore(
    (store) => store.clusterAssignmentOrientation
  );

  return (
    <div
      className={cn(
        "flex rounded-sm overflow-hidden",
        clusterAssignmentOrientation === "horizontal"
          ? "flex-col-reverse w-full"
          : "flex-row-reverse h-full"
      )}
    >
      {clusterAssignmentHistory.map(({ timestamp, entries }, index) => {
        const opacity = (
          (clusterAssignmentHistory.length - index) /
          (clusterAssignmentHistory.length + 3)
        ).toFixed(2);

        return (
          <div
            key={`${timestamp}-${index}`}
            style={{ opacity }}
            className={cn(
              clusterAssignmentOrientation === "horizontal"
                ? "w-full"
                : "h-full"
            )}
          >
            <LegendBar entries={entries} />
          </div>
        );
      })}
    </div>
  );
};

const LegendBar = ({ entries }: { entries: [string, number][] }) => {
  const remove = useStreamSelectionStore((state) => state.remove);
  const add = useStreamSelectionStore((state) => state.add);
  const clusterAssignmentOrientation = useStreamClustersSettingsStore(
    (store) => store.clusterAssignmentOrientation
  );

  return (
    <div
      className={cn(
        "flex shrink items-center overflow-hidden",
        clusterAssignmentOrientation === "horizontal"
          ? "flex-row"
          : "flex-col h-full"
      )}
    >
      {entries.map(([name, styleGroup], index) => (
        <div
          key={`${name}-${index}`}
          onMouseEnter={() => add(name)}
          onMouseLeave={() => remove(name)}
          className={cn(
            "flex-1",
            clusterAssignmentOrientation === "horizontal" ? "h-4" : "w-4",
            index > 0 && clusterAssignmentOrientation === "horizontal"
              ? "border-l-[0.5px]"
              : "",
            index > 0 && clusterAssignmentOrientation === "vertical"
              ? "border-t-[0.5px]"
              : ""
          )}
          style={{
            background: clusterColors[styleGroup % clusterColors.length],
          }}
        ></div>
      ))}
    </div>
  );
};

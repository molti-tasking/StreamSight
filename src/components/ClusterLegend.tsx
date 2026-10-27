import { cn } from "@/lib/utils";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { useManualAssignmentStore } from "@/store/useManualAssignmentStore";
import { useState } from "react";
import { colorForClusterId } from "./clusterColors";
import { useStreamSelectionStore } from "@/store/useStreamSelectionStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

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
          <LegendBar entries={clusterAssignment} pinnable />
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

const LegendBar = ({
  entries,
  pinnable = false,
}: {
  entries: [string, number][];
  pinnable?: boolean;
}) => {
  const remove = useStreamSelectionStore((state) => state.remove);
  const add = useStreamSelectionStore((state) => state.add);
  const clusterAssignmentOrientation = useStreamClustersSettingsStore(
    (store) => store.clusterAssignmentOrientation
  );
  const animate = useStreamClustersSettingsStore(
    (store) => store.animateTransitions
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
      {entries.map(([name, styleGroup], index) => {
        const cell = (
          <div
            onMouseEnter={() => add(name)}
            onMouseLeave={() => remove(name)}
            className={cn(
              "flex-1",
              animate && "transition-colors duration-700",
              clusterAssignmentOrientation === "horizontal" ? "h-4" : "w-4",
              index > 0 && clusterAssignmentOrientation === "horizontal"
                ? "border-l-[0.5px]"
                : "",
              index > 0 && clusterAssignmentOrientation === "vertical"
                ? "border-t-[0.5px]"
                : ""
            )}
            style={{
              background: colorForClusterId(styleGroup),
            }}
          ></div>
        );

        if (!pinnable) return <div key={`${name}-${index}`}>{cell}</div>;

        return (
          <StreamPinCell
            key={`${name}-${index}`}
            name={name}
            currentCluster={styleGroup}
          >
            {cell}
          </StreamPinCell>
        );
      })}
    </div>
  );
};

/**
 * Wraps a legend cell in a popover that lets the user pin the stream to a
 * specific cluster (manual / static assignment) or release it back to automatic
 * clustering.
 */
const StreamPinCell = ({
  name,
  currentCluster,
  children,
}: {
  name: string;
  currentCluster: number;
  children: React.ReactNode;
}) => {
  const clusterIds = useViewModelStore((s) => s.clusterIds);
  const pins = useManualAssignmentStore((s) => s.pins);
  const pin = useManualAssignmentStore((s) => s.pin);
  const unpin = useManualAssignmentStore((s) => s.unpin);

  const targets = Array.from(new Set(clusterIds)).sort((a, b) => a - b);
  const isPinned = name in pins;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="flex-1 flex"
          onClick={(e) => e.stopPropagation()}
          title={`${name}${isPinned ? " (pinned)" : ""}`}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-56"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-semibold mb-2">
          Assign “{name}” to cluster
        </div>
        <div className="flex flex-row flex-wrap gap-1 mb-2">
          {targets.map((id) => (
            <button
              key={id}
              onClick={() => pin(name, id)}
              className={cn(
                "h-6 w-6 rounded-sm border",
                id === currentCluster ? "ring-2 ring-black" : ""
              )}
              style={{
                background: colorForClusterId(id),
              }}
              title={id < 0 ? "Outliers" : `Cluster ${id}`}
            />
          ))}
        </div>
        <button
          onClick={() => unpin(name)}
          disabled={!isPinned}
          className={cn(
            "text-xs underline",
            isPinned ? "text-blue-600" : "text-gray-400 cursor-default"
          )}
        >
          Release to automatic clustering
        </button>
      </PopoverContent>
    </Popover>
  );
};

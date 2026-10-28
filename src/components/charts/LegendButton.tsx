import { Badge } from "../ui/badge";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";

export const LegendButton = ({
  dimensions,
  children,
}: {
  dimensions: string[];
  children: React.ReactNode;
}) => {
  const showClusterLegend = useStreamClustersSettingsStore(
    (state) => state.showClusterLegend
  );

  if (!showClusterLegend) {
    return children;
  }

  // A small corner button lists the cluster's streams; the chart itself
  // stays free for pointer interaction (hover / click a stream).
  return (
    <div className="absolute inset-0">
      {children}
      <HoverCard openDelay={150}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="absolute top-0.5 right-0.5 z-10 rounded-full bg-white/80 px-1 text-[10px] leading-4 text-gray-600 shadow-sm"
            aria-label={`Streams in this cluster (${dimensions.length})`}
          >
            ⓘ {dimensions.length}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 lg:w-2xl">
          <h4 className="font-medium mb-2">Streams ({dimensions.length})</h4>
          <p className="flex flex-row gap-1 flex-wrap">
            {dimensions.map((dim) => (
              <Badge key={dim}>{dim}</Badge>
            ))}
          </p>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};

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

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="absolut top-0 bottom-0 left-0 right-0 cursor-help z-50 w-full h-full">
          {children}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 lg:w-2xl xl:w-4xl">
        <h4 className="font-medium mb-2">Streams</h4>
        <p className="flex flex-row gap-1 flex-wrap">
          {dimensions.map((dim) => (
            <Badge key={dim}>{dim}</Badge>
          ))}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
};

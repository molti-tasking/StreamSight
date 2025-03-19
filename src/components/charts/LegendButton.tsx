import { Button } from "../ui/button";
import { MessageSquareText } from "lucide-react";
import { Badge } from "../ui/badge";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";

export const LegendButton = ({ dimensions }: { dimensions: string[] }) => {
  const showClusterLegend = useStreamClustersSettingsStore(
    (state) => state.showClusterLegend
  );

  if (!showClusterLegend) {
    return <></>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          variant="outline"
          size={"icon"}
          className="cursor-pointer rounded-full"
        >
          <MessageSquareText />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-80">
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

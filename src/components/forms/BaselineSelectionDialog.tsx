"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRawDataStore } from "@/store/useRawDataStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { VegaLiteChartBaselineSelection } from "../charts/VegaLiteChartBaselineSelection";

export function BaselineSelectionDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const baseline = useStreamClustersSettingsStore((state) => state.baseline);
  const baselineText = baseline
    ? baseline.toLocaleTimeString()
    : "No baseline set";

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => setIsOpen(isOpen)}>
      <DialogTrigger asChild className="cursor-pointer">
        <Button
          variant="ghost"
          className="italic text-xs text-muted-foreground"
          size={"sm"}
        >
          {baselineText}
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Baseline</DialogTitle>
          <DialogDescription>
            Choose the baseline for the processing
          </DialogDescription>
        </DialogHeader>
        <BaselineSelection />
      </DialogContent>
    </Dialog>
  );
}

const BaselineSelection = () => {
  const rawData = useRawDataStore((state) => state.values);
  const timestamps = rawData.map((data) => new Date(data["timestamp"]));

  const baseline = useStreamClustersSettingsStore((state) => state.baseline);
  const updateSettings = useStreamClustersSettingsStore(
    (state) => state.updateSettings
  );

  const updateBaseline = (newBaseline: number | string | null) => {
    const baselineValues = rawData.find(
      (entry) => entry["timestamp"] === newBaseline
    );
    updateSettings((settings) => ({
      ...settings,
      baseline: newBaseline ? new Date(newBaseline) : null,
      baselineValues,
    }));
  };

  return (
    <div>
      <div className="flex flex-row gap-2 items-center justify-end mb-2">
        <Select value={baseline?.toJSON()} onValueChange={updateBaseline}>
          <SelectTrigger className="w-[180px]">
            <div className="flex flex-row items-center gap-2">
              <SelectValue placeholder={"Baseline"} className="justify-start" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {timestamps.map((timestamp) => (
                <SelectItem value={timestamp.toJSON()} key={timestamp.toJSON()}>
                  {timestamp.toLocaleTimeString()}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant={"destructiveSubtle"}
          disabled={!baseline}
          onClick={() => updateBaseline(null)}
        >
          <XIcon className="mr-2" /> Remove baseline
        </Button>
      </div>

      <div>
        <VegaLiteChartBaselineSelection onSelect={updateBaseline} />
      </div>
    </div>
  );
};

{
  /* <div className="flex flex-row gap-1 flex-wrap">
{timestamps.map(timestamp => 
{
const isSelected= timestamp ===baseline
return <div key={timestamp.toTimeString()}>
{timestamp.toLocaleTimeString()}
</div>
}

)}

</div> */
}

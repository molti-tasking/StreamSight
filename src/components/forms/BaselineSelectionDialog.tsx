import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { XIcon } from "lucide-react";

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

  return (
    <div className="flex flex-row gap-2 items-center">
      <Select
        value={baseline?.toJSON()}
        onValueChange={(value) =>
          updateSettings((settings) => ({
            ...settings,
            baseline: new Date(value),
          }))
        }
      >
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
        onClick={() =>
          updateSettings((settings) => ({
            ...settings,
            baseline: null,
          }))
        }
      >
        <XIcon className="mr-2" /> Remove baseline
      </Button>
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

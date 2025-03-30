"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  clusteringModeOptions,
  DataProcessingSettings,
  dataProcessingSettingsSchema,
} from "@/lib/settings/DataProcessingSettings";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export const DataProcessingSettingsForm = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const viewSettings = useClusterProcessingSettingsStore();
  // const addSettingUpdateEvent = useExploratoryStore(
  //   (state) => state.addSettingUpdateEvent
  // );
  const { updateSettings, clusteringMode, ...settings } = viewSettings;

  const form = useForm<DataProcessingSettings>({
    resolver: zodResolver(dataProcessingSettingsSchema),
    defaultValues: settings,
  });

  const onSubmit = (data: DataProcessingSettings) => {
    // addSettingUpdateEvent(settings, data);
    updateSettings((prevSettings) => ({ ...prevSettings, ...data }));

    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, (e) => console.log(e))}>
        <div className="grid gap-4">
          <div>
            <Label>Clustering Mode</Label>
            <Select
              value={clusteringMode}
              onValueChange={(value) =>
                updateSettings((settings) => ({
                  ...settings,
                  clusteringMode:
                    value as DataProcessingSettings["clusteringMode"],
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex flex-row items-center gap-2">
                  <SelectValue
                    placeholder={"Select clustering mode"}
                    className="justify-start"
                  />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(clusteringModeOptions).map(([key, label]) => (
                    <SelectItem value={key} key={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {clusteringMode === "automatic" && (
            <FormField
              control={form.control}
              name="eps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Similarity Threshold</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Similarity Threshold"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Define the threshold of how similar one cluster should be.
                    The smaller the value, the more clusters you will have.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {clusteringMode === "manual" && (
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label className="flex flex-row justify-between items-center gap-1.5">
                      <span>Manual Mode</span>
                      <Badge
                        variant={"secondary"}
                        className="rounded-full h-4 w-4 text-[12px] m-1"
                      >
                        ?
                      </Badge>
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    Manually assign streams to clusters. Click on a stream to
                    select it, then choose a cluster number to assign it to.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="text-xs mt-1 text-gray-500">
                Click on streams to assign them to clusters
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button variant={"outline"} onClick={() => onClose()} type="button">
              Close
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

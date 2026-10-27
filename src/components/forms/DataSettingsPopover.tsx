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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRawDataStore } from "@/store/useRawDataStore";
import { usePlaybackStore } from "@/store/usePlaybackStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

export function DataSettingsPopover() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="hover:underline">
          <ChevronDownIcon /> Configure Scale
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <DataSimulationSettingsForm onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

const formSchema = z.object({
  mode: z.enum(["random", "peaks"]),
  rows: z.coerce.number<number>(),
  columns: z.coerce.number<number>(),
  streamingInterval: z.coerce.number<number>(),
});

type FormValues = z.infer<typeof formSchema>;

const DataSimulationSettingsForm = ({ onClose }: { onClose: () => void }) => {
  const dimensions = useRawDataStore((state) => state.dimensions);
  const values = useRawDataStore((state) => state.values);

  const load = usePlaybackStore((state) => state.load);

  const intervalMs = usePlaybackStore((state) => state.intervalMs);

  const defaultValues = {
    mode: "peaks" as const,
    rows: values.length,
    columns: dimensions.length + 1,
    streamingInterval: intervalMs,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = (data: FormValues) => {
    const { rows, columns, streamingInterval } = data;

    // Legacy popover (only used by the unused Navigation component): loads
    // a seeded synthetic stream of the requested size.
    void load({
      kind: "synthetic",
      config: {
        seed: 1,
        nStreams: columns,
        nTicks: rows,
        nClusters: 4,
        intervalMs: streamingInterval > 0 ? streamingInterval : 1000,
      },
    });

    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="text-lg font-medium leading-none">Scale</h4>
            <p className="text-sm text-muted-foreground">
              Set the scale for the data.
            </p>
          </div>

          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Generation Mode</FormLabel>
                <FormControl>
                  <Tabs
                    value={field.value}
                    onValueChange={(mode) => field.onChange(mode)}
                  >
                    <TabsList>
                      {formSchema.shape.mode.options.map((mode) => (
                        <TabsTrigger value={mode} key={mode}>
                          {mode}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormDescription>
                  Depending on the selected mode the generated data will follow
                  a certain pattern.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="columns"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Columns</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Colums" {...field} />
                </FormControl>
                <FormDescription>
                  This is the amount of parallel time series.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rows"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rows</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Rows" {...field} />
                </FormControl>
                <FormDescription>
                  This is the amount of timestamps for each time series
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="streamingInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Streaming Interval (ms)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Streaming Interval"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is the time in milliseconds as in interval in order to
                  append a new row to the data set.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">Reset & Submit</Button>
        </div>
      </form>
    </Form>
  );
};

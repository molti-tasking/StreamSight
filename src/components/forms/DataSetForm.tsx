import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn, monitoringPeriodOptions } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useRawDataStore } from "@/store/useRawDataStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormSubmitButton } from "../FormSubmitButton";
import { Input } from "../ui/input";

const formSchema = z.object({
  dataSet: z.enum(["S&P500", "GDP", "peak-simulation"]),
  peakSimulation: z.object({
    rows: z.coerce.number(),
    columns: z.coerce.number(),
    streamingInterval: z.coerce.number(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

const initialSimulationData = {
  rows: 20,
  columns: 80,
  streamingInterval: 3000,
};

export const DataSetForm = () => {
  const router = useRouter();
  const dimensions = useRawDataStore((state) => state.dimensions);
  const values = useRawDataStore((state) => state.values);
  const streamingInterval = useRawDataStore((state) => state.streamingInterval);
  const updateData = useRawDataStore((state) => state.updateData);
  const loadDataset = useRawDataStore((state) => state.loadDataset);
  const updateClustering = useClusterProcessingSettingsStore(
    (state) => state.updateSettings
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dataSet: "peak-simulation",
      peakSimulation:
        values.length && dimensions.length
          ? {
              rows: values.length,
              columns: dimensions.length + 1,
              streamingInterval: streamingInterval ?? 0,
            }
          : initialSimulationData,
    },
  });

  const getCardProps = (
    option: FormValues["dataSet"],
    field: ControllerRenderProps<FormValues, "dataSet">
  ): React.HTMLAttributes<HTMLDivElement> => {
    const isActive = field.value === option;

    return {
      onClick: () => {
        if (isActive) {
          form.reset({ dataSet: undefined });
        } else {
          field.onChange(option);
        }
      },
      className: cn(
        "hover:shadow-lg transition-all cursor-pointer",
        isActive ? "shadow-xl border-primary/50" : "hover:bg-primary/5",
        !isActive && field.value !== undefined ? "opacity-40" : " "
      ),
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (data.dataSet === "peak-simulation") {
      updateData(
        "peaks",
        data.peakSimulation.columns + 1,
        data.peakSimulation.rows,
        data.peakSimulation.streamingInterval
      );
    } else {
      if (data.dataSet === "GDP") {
        updateClustering((state) => ({
          ...state,
          eps: 100000,
          monitoringPeriod: monitoringPeriodOptions["10 years"],
        }));
      }

      loadDataset(data.dataSet);
    }
    toast("🎉 Great Choice", {
      className: "bg-green-400",
      description: "Let's monitor that data with Streamclusters",
    });
    router.push("/streamclusters");
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, console.log)}
        className="max-w-2xl pb-8"
      >
        <FormField
          control={form.control}
          name="dataSet"
          render={({ field }) => (
            <div className="flex flex-col gap-4">
              <Card {...getCardProps("peak-simulation", field)}>
                <CardHeader>
                  <CardTitle>Peaking Data Simulation</CardTitle>
                  <CardDescription>
                    Free configuration of a data stream with random peaks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="peakSimulation.columns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Columns</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Colums"
                            onClick={(e) => e.stopPropagation()}
                            {...field}
                          />
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
                    name="peakSimulation.rows"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rows</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Rows"
                            onClick={(e) => e.stopPropagation()}
                            {...field}
                          />
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
                    name="peakSimulation.streamingInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Streaming Interval (ms)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Streaming Interval"
                            onClick={(e) => e.stopPropagation()}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the time in milliseconds as in interval in
                          order to append a new row to the data set.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <Card {...getCardProps("GDP", field)}>
                <CardHeader>
                  <CardTitle>GDP Streaming</CardTitle>
                  <CardDescription>
                    212 parallel time series will be streamed from 1970 until
                    2022
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card {...getCardProps("S&P500", field)}>
                <CardHeader>
                  <CardTitle>S&P 500 Streaming</CardTitle>
                  <CardDescription>
                    500 parallel time series of S&P 500 stock values on a daily
                    basis
                  </CardDescription>
                </CardHeader>
              </Card>
              <FormMessage />
            </div>
          )}
        />

        <div className="flex flex-row-reverse my-4">
          <FormSubmitButton>
            Next <ArrowRightIcon className="ml-2" />
          </FormSubmitButton>
        </div>
      </form>
    </Form>
  );
};

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
import { cn } from "@/lib/utils";
import { usePlaybackStore } from "@/store/usePlaybackStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon } from "lucide-react";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { z } from "zod";
import { FormSubmitButton } from "../FormSubmitButton";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { dataSets } from "@/data/streamDataSet";

const formSchema = z.object({
  dataSet: z.enum(["NIRS", "S&P500", "GDP", "synthetic"]),
  synthetic: z.object({
    seed: z.coerce.number<number>().int(),
    nStreams: z.coerce.number<number>().int().min(1),
    nClusters: z.coerce.number<number>().int().min(1),
    nTicks: z.coerce.number<number>().int().min(2),
    membershipSwitches: z.coerce.number<number>().int().min(0),
    anomalies: z.coerce.number<number>().int().min(0),
    intervalMs: z.coerce.number<number>().positive(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

/** Defaults for the seeded synthetic stream (one hour at 1 row/s). */
export const defaultSyntheticConfig: FormValues["synthetic"] = {
  seed: 1,
  nStreams: 80,
  nClusters: 5,
  nTicks: 3600,
  membershipSwitches: 8,
  anomalies: 12,
  intervalMs: 1000,
};

const syntheticFields: {
  name: keyof FormValues["synthetic"];
  label: string;
  description: string;
}[] = [
  { name: "seed", label: "Seed", description: "Same seed and settings, same data." },
  { name: "nStreams", label: "Streams", description: "Number of parallel time series." },
  { name: "nClusters", label: "Clusters", description: "Planted ground-truth clusters." },
  { name: "nTicks", label: "Length (rows)", description: "Total rows in the stream." },
  {
    name: "membershipSwitches",
    label: "Membership switches",
    description: "Streams that move to another cluster at a known time.",
  },
  { name: "anomalies", label: "Anomalies", description: "Injected spikes, drops and level shifts." },
  { name: "intervalMs", label: "Interval (ms)", description: "Time between rows at native speed." },
];

export const DataSetForm = () => {
  const router = useRouter();
  const load = usePlaybackStore((state) => state.load);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dataSet: "NIRS",
      synthetic: defaultSyntheticConfig,
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
    void load(
      data.dataSet === "synthetic"
        ? { kind: "synthetic", config: data.synthetic }
        : { kind: "dataset", dataSet: data.dataSet }
    );
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
              {(["NIRS", "S&P500"] as const).map((key) => (
                <Card key={key} {...getCardProps(key, field)}>
                  <CardHeader>
                    <CardTitle>{dataSets[key].label}</CardTitle>
                    <CardDescription>{dataSets[key].description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
              <Card {...getCardProps("synthetic", field)}>
                <CardHeader>
                  <CardTitle>Synthetic stream (seeded)</CardTitle>
                  <CardDescription>
                    Streams follow planted clusters, some switch cluster and
                    some show injected anomalies, all at known times
                    (ground truth for evaluation and user studies).
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {syntheticFields.map(({ name, label, description }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={`synthetic.${name}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              onClick={(e) => e.stopPropagation()}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>{description}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground mt-2">
                Non-streaming demo data
              </p>
              <Card {...getCardProps("GDP", field)}>
                <CardHeader>
                  <CardTitle>{dataSets.GDP.label}</CardTitle>
                  <CardDescription>{dataSets.GDP.description}</CardDescription>
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

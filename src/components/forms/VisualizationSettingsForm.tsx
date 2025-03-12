"use client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StreamClustersSettings,
  streamClustersSettingsSchema,
} from "@/lib/settings/StreamClustersSettings";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Switch } from "../ui/switch";

const layoutViewOptions: Record<StreamClustersSettings["layoutMode"], string> =
  {
    treemap: "Treemap",
    grid: "Grid",
    list: "List",
    clusterMap: "Cluster Map",
  };

const treemapViewOptions: Record<
  StreamClustersSettings["treemapSignificanceMode"],
  string
> = {
  clusterSize: "Cluster size",
  clusterVariance: "Cluster variance",
};

const chartViewOptions: Record<StreamClustersSettings["chartMode"], string> = {
  highlighted: "Highlighted",
  multiline: "Multiline",
  envelope: "Envelope",
  plotly: "Plotly",
};
const clusterAssignmentOrientationOptions: Record<
  StreamClustersSettings["clusterAssignmentOrientation"],
  string
> = {
  vertical: "Vertical",
  horizontal: "Horizontal",
};

export const VisualizationSettingsForm = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const { updateSettings, ...settings } = useStreamClustersSettingsStore();

  const form = useForm<StreamClustersSettings>({
    resolver: zodResolver(streamClustersSettingsSchema),
    defaultValues: settings,
  });

  const onSubmit = (data: StreamClustersSettings) => {
    updateSettings((prevSettings) => ({ ...prevSettings, ...data }));
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, (e) => console.log(e))}>
        <div className="grid gap-4">
          {/* <div className="space-y-2">
            <h4 className="text-2xl font-medium leading-none">
              Streamclusters
            </h4>

            <p className="text-sm text-muted-foreground">
              Build your combinations of tools for the suitable visualization.
            </p>
          </div> */}

          <h3>Layout</h3>

          <FormField
            control={form.control}
            name="layoutMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Layout Mode</FormLabel>
                <FormControl>
                  <Tabs
                    value={field.value}
                    onValueChange={(mode) => field.onChange(mode)}
                  >
                    <TabsList>
                      {Object.entries(layoutViewOptions).map(([key, label]) => (
                        <TabsTrigger value={key} key={key}>
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent
                      value={"treemap"}
                      className="grid w-full gap-2"
                    >
                      <FormField
                        control={form.control}
                        name="treemapSignificanceMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>treemap Significance Mode</FormLabel>
                            <FormControl>
                              <Tabs
                                value={field.value}
                                onValueChange={(mode) => field.onChange(mode)}
                              >
                                <TabsList>
                                  {Object.entries(treemapViewOptions).map(
                                    ([key, label]) => (
                                      <TabsTrigger value={key} key={key}>
                                        {label}
                                      </TabsTrigger>
                                    )
                                  )}
                                </TabsList>
                              </Tabs>
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <hr />

          <h3>Clusters</h3>
          <FormField
            control={form.control}
            name="showClusterAssignments"
            render={({ field }) => (
              <>
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Switch
                      id="showClusterAssignments-switch"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel htmlFor="showClusterAssignments-switch">
                    Cluster assignment
                  </FormLabel>
                </FormItem>

                {field.value && (
                  <div className="grid grid-cols-2">
                    <FormField
                      control={form.control}
                      name="clusterAssignmentOrientation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cluster Assignment Orientation</FormLabel>
                          <FormControl>
                            <Tabs
                              value={field.value}
                              onValueChange={(mode) => field.onChange(mode)}
                            >
                              <TabsList>
                                {Object.entries(
                                  clusterAssignmentOrientationOptions
                                ).map(([key, label]) => (
                                  <TabsTrigger value={key} key={key}>
                                    {label}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                            </Tabs>
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clusterAssignmentHistoryDepth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Cluster Assignment History Depth
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Cluster Assignment History Depth"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Define the amount of how many cluster assignment
                            history layers should be displayed.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}
          />
          <hr />
          <h3>Highlighting</h3>

          <FormField
            control={form.control}
            name="chartMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chart View Mode</FormLabel>
                <FormControl>
                  <Tabs
                    value={field.value}
                    onValueChange={(mode) => field.onChange(mode)}
                  >
                    <TabsList>
                      {Object.entries(chartViewOptions).map(([key, label]) => (
                        <TabsTrigger value={key} key={key}>
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <hr />
          <h3>Label / Annotation</h3>
          <hr />

          <h3>Animation</h3>

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

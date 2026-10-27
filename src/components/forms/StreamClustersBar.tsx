import { cn } from "@/lib/utils";
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
  chartViewOptions,
  clusterAssignmentOrientationOptions,
  layoutViewOptions,
  StreamClustersSettings,
} from "@/lib/settings/StreamClustersSettings";
import { clusterOrderOptions } from "@/lib/clustering/orderClusters";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { useManualAssignmentStore } from "@/store/useManualAssignmentStore";
import { useViewModelStore } from "@/store/useViewModelStore";
import { Separator } from "@/components/ui/separator";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Badge } from "../ui/badge";

type LayoutMode = StreamClustersSettings["layoutMode"];
// type TreemapMode = StreamClustersSettings["treemapSignificanceMode"];
type Orientation = StreamClustersSettings["clusterAssignmentOrientation"];
type Chart = StreamClustersSettings["chartMode"];
type OrderMode = StreamClustersSettings["clusterOrderMode"];

export const StreamClustersBar = () => {
  const {
    updateSettings,
    layoutMode,
    // treemapSignificanceMode,
    clusterAssignmentHistoryDepth,
    clusterAssignmentOrientation,
    showClusterAssignments,
    chartMode,
    clusterOrderMode,
    animateTransitions,
    showStreamLabel,
    showClusterLegend,
  } = useStreamClustersSettingsStore();

  const locked = useManualAssignmentStore((s) => s.locked);
  const pinCount = useManualAssignmentStore(
    (s) => Object.keys(s.pins).length
  );
  const lockCurrent = useManualAssignmentStore((s) => s.lockCurrent);
  const unlock = useManualAssignmentStore((s) => s.unlock);
  const clusterAssignment = useViewModelStore((s) => s.clusterAssignment);
  const anomalies = useViewModelStore((s) => s.anomalies);

  return (
    <div className="flex flex-row">
      <SettingSection title="Layout">
        <Label>Layout</Label>
        <Select
          value={layoutMode}
          onValueChange={(value) =>
            updateSettings((settings) => ({
              ...settings,
              layoutMode: value as LayoutMode,
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <div className="flex flex-row items-center gap-2">
              <SelectValue
                placeholder={"Layout Mode"}
                className="justify-start"
              />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(layoutViewOptions).map(([key, label]) => (
                <SelectItem value={key} key={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* {layoutMode === "treemap" && (
          <>
            <Label>Treemap Significance</Label>
            <Select
              value={treemapSignificanceMode}
              onValueChange={(value) =>
                updateSettings((settings) => ({
                  ...settings,
                  treemapSignificanceMode: value as TreemapMode,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex flex-row items-center gap-2">
                  <SelectValue
                    placeholder={"Layout Mode"}
                    className="justify-start"
                  />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(treemapViewOptions).map(([key, label]) => (
                    <SelectItem value={key} key={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        )} */}
      </SettingSection>

      <Separator orientation="vertical" className="mx-4" />

      <SettingSection title="Clusters">
        <div className="flex flex-row items-center gap-2 space-y-0">
          <Switch
            id="showClusterAssignments-switch"
            checked={showClusterAssignments}
            onCheckedChange={(value) =>
              updateSettings((settings) => ({
                ...settings,
                showClusterAssignments: value,
              }))
            }
          />

          <Label htmlFor="showClusterAssignments-switch">
            Cluster assignment
          </Label>
        </div>

        <div className="flex flex-row items-center gap-2 space-y-0 mt-2">
          <Switch
            id="lockAssignments-switch"
            checked={locked}
            onCheckedChange={(value) =>
              value ? lockCurrent(clusterAssignment) : unlock()
            }
          />
          <Label htmlFor="lockAssignments-switch">
            Static grouping{locked && pinCount ? ` (${pinCount})` : ""}
          </Label>
        </div>

        <div className="mt-2">
          <Label>Order by</Label>
          <Select
            value={clusterOrderMode}
            onValueChange={(value) =>
              updateSettings((settings) => ({
                ...settings,
                clusterOrderMode: value as OrderMode,
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Order" className="justify-start" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(clusterOrderOptions).map(([key, label]) => (
                  <SelectItem value={key} key={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {showClusterAssignments && (
          <div className="mt-2 flex flex-row items-end gap-2">
            <Tabs
              value={clusterAssignmentOrientation}
              onValueChange={(value) =>
                updateSettings((settings) => ({
                  ...settings,
                  clusterAssignmentOrientation: value as Orientation,
                }))
              }
            >
              <TabsList>
                {Object.entries(clusterAssignmentOrientationOptions).map(
                  ([key, label]) => (
                    <TabsTrigger value={key} key={key}>
                      {label}
                    </TabsTrigger>
                  )
                )}
              </TabsList>
            </Tabs>

            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label className="flex flex-row justify-between items-center gap-1.5">
                      <span>Layers</span>
                      <Badge
                        variant={"secondary"}
                        className="rounded-full h-4 w-4 text-[12px] m-1"
                      >
                        ?
                      </Badge>
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    Define the amount of how many cluster assignment history
                    layers should be displayed.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Input
                type="number"
                placeholder="Cluster Assignment History Depth"
                value={clusterAssignmentHistoryDepth}
                onChange={({ target }) =>
                  updateSettings((settings) => ({
                    ...settings,
                    clusterAssignmentHistoryDepth: target.valueAsNumber,
                  }))
                }
              />
            </div>
          </div>
        )}
      </SettingSection>

      <Separator orientation="vertical" className="mx-4" />

      <SettingSection title="Highlighting">
        <Label>Chart View Mode</Label>
        <Select
          value={chartMode}
          onValueChange={(value) =>
            updateSettings((settings) => ({
              ...settings,
              chartMode: value as Chart,
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <div className="flex flex-row items-center gap-2">
              <SelectValue
                placeholder={"Layout Mode"}
                className="justify-start"
              />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(chartViewOptions).map(([key, label]) => (
                <SelectItem value={key} key={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="flex flex-row items-center gap-2 mt-2">
          <Switch
            id="animateTransitions-switch"
            checked={animateTransitions}
            onCheckedChange={(value) =>
              updateSettings((settings) => ({
                ...settings,
                animateTransitions: value,
              }))
            }
          />
          <Label htmlFor="animateTransitions-switch">Animate changes</Label>
        </div>
      </SettingSection>

      <Separator orientation="vertical" className="mx-4" />

      <SettingSection title="Label / Annotation">
        <div className="flex flex-row items-center gap-2 mb-2">
          <Switch
            id="showStreamLabel-switch"
            checked={showStreamLabel}
            onCheckedChange={(value) =>
              updateSettings((settings) => ({
                ...settings,
                showStreamLabel: value,
              }))
            }
          />

          <Label htmlFor="showStreamLabel-switch">Stream Label</Label>
        </div>

        <div className="flex flex-row items-center gap-2">
          <Switch
            id="showClusterLegend-switch"
            checked={showClusterLegend}
            onCheckedChange={(value) =>
              updateSettings((settings) => ({
                ...settings,
                showClusterLegend: value,
              }))
            }
          />

          <Label htmlFor="showClusterLegend-switch">Cluster Legend</Label>
        </div>
      </SettingSection>

      <Separator orientation="vertical" className="mx-4" />

      <SettingSection title="Anomalies">
        <div className="w-[200px] max-h-24 overflow-auto text-xs">
          {anomalies.length === 0 ? (
            <p className="text-gray-400">No anomalies detected</p>
          ) : (
            <ul className="space-y-0.5">
              <li className="font-semibold">
                {anomalies.length} detected
              </li>
              {anomalies.slice(0, 6).map((a, i) => (
                <li
                  key={`${a.dimension}-${a.timestamp}-${i}`}
                  className={cn(
                    a.type === "spike" && "text-red-600",
                    a.type === "drop" && "text-blue-600",
                    a.type === "regime-change" && "text-purple-600"
                  )}
                >
                  {a.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingSection>
    </div>
  );
};

const SettingSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="grid justify-center gap-2 pt-2">
      <div>{children}</div>
      <div className="text-gray-500 font-bold text-xs uppercase text-center self-end mx-4">
        {title}
      </div>
    </div>
  );
};

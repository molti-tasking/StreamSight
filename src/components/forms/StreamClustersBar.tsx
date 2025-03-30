"use client";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  chartViewOptions,
  clusterAssignmentOrientationOptions,
  layoutViewOptions,
  StreamClustersSettings,
} from "@/lib/settings/StreamClustersSettings";
import { monitoringPeriodOptions } from "@/lib/utils";
import { useClusterProcessingSettingsStore } from "@/store/ClusterProcessingSettingsStore";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
import { BaselineSelectionDialog } from "./BaselineSelectionDialog";

type LayoutMode = StreamClustersSettings["layoutMode"];
// type TreemapMode = StreamClustersSettings["treemapSignificanceMode"];
type Orientation = StreamClustersSettings["clusterAssignmentOrientation"];
type Chart = StreamClustersSettings["chartMode"];

export const StreamClustersBar = () => {
  const {
    updateSettings,
    layoutMode,
    // treemapSignificanceMode,
    clusterAssignmentHistoryDepth,
    clusterAssignmentOrientation,
    showClusterAssignments,
    chartMode,
    showStreamLabel,
    showClusterLegend,
  } = useStreamClustersSettingsStore();

  const { monitoringPeriod, ...dataProcessingStore } =
    useClusterProcessingSettingsStore();

  return (
    <div className="flex flex-row">
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

        {showClusterAssignments && (
          <div className="flex flex-row items-end gap-2">
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

      <Separator orientation="vertical" className="mx-2" />

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

      <Separator orientation="vertical" className="mx-2" />

      <SettingSection title="Visualization">
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
      </SettingSection>

      <Separator orientation="vertical" className="mx-2" />

      <SettingSection title="Timeline">
        <div>
          <Label>Monitoring Period</Label>
          <Select
            value={String(monitoringPeriod)}
            onValueChange={(value) =>
              dataProcessingStore.updateSettings((settings) => ({
                ...settings,
                monitoringPeriod: Number(value),
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
                {Object.entries(monitoringPeriodOptions).map(
                  ([label, value]) => (
                    <SelectItem value={String(value)} key={label}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </SettingSection>

      <Separator orientation="vertical" className="mx-2" />

      <SettingSection title="Annotation">
        <div className="flex flex-row items-center justify-between mb-1 gap-1">
          <Label>Baseline</Label>
          <div>
            <BaselineSelectionDialog />
          </div>
        </div>

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

          <Label htmlFor="showStreamLabel-switch">Hover Stream Label</Label>
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

          <Label htmlFor="showClusterLegend-switch">Hover Cluster Legend</Label>
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
    <div className="grid justify-center gap-2 pt-1 px-1">
      <div>{children}</div>
      <div className="text-gray-500 font-bold text-xs uppercase text-center self-end mx-2">
        {title}
      </div>
    </div>
  );
};

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
  treemapViewOptions,
} from "@/lib/settings/StreamClustersSettings";
import { useStreamClustersSettingsStore } from "@/store/useStreamClustersSettingsStore";
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
type TreemapMode = StreamClustersSettings["treemapSignificanceMode"];
type Orientation = StreamClustersSettings["clusterAssignmentOrientation"];
type Chart = StreamClustersSettings["chartMode"];

export const StreamClustersBar = () => {
  const {
    updateSettings,
    layoutMode,
    treemapSignificanceMode,
    clusterAssignmentHistoryDepth,
    clusterAssignmentOrientation,
    showClusterAssignments,
    chartMode,
  } = useStreamClustersSettingsStore();

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

        {layoutMode === "treemap" && (
          <>
            <Label>Treemap Significance Mode</Label>
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
        )}
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
                    <Label>
                      Layers{" "}
                      <Badge
                        variant={"secondary"}
                        className="rounded-full h-4 w-4 text-[12px] ml-1.5"
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
      </SettingSection>

      <Separator orientation="vertical" className="mx-4" />

      <SettingSection title="Label / Annotation">
        <p>TBD</p>
      </SettingSection>

      <Separator orientation="vertical" className="mx-4" />

      <SettingSection title="Animation">
        <p>TBD</p>
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

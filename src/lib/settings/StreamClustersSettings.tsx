import { SeparatorVertical, SeparatorHorizontal } from "lucide-react";
import { z } from "zod";

export const streamClustersSettingsSchema = z.object({
  layoutMode: z.enum(["treemap", "grid", "list", "baseline", "clusterMap"]),
  showClusterAssignments: z.coerce.boolean(),
  clusterAssignmentHistoryDepth: z.coerce.number(),
  clusterAssignmentOrientation: z.enum(["vertical", "horizontal"]),
  treemapSignificanceMode: z.enum(["clusterSize", "clusterVariance"]),
  chartMode: z.enum(["highlighted", "multiline", "envelope", "plotly"]),
  showStreamLabel: z.coerce.boolean(),
  showClusterLegend: z.coerce.boolean(),
});

export type StreamClustersSettings = z.infer<
  typeof streamClustersSettingsSchema
>;

export const layoutViewOptions: Omit<
  Record<StreamClustersSettings["layoutMode"], string>,
  "clusterMap"
> = {
  treemap: "Treemap",
  grid: "Grid",
  list: "List",
  baseline: "Baseline",
};

export const treemapViewOptions: Record<
  StreamClustersSettings["treemapSignificanceMode"],
  string
> = {
  clusterSize: "Cluster size",
  clusterVariance: "Cluster variance",
};

export const chartViewOptions: Omit<
  Record<StreamClustersSettings["chartMode"], string>,
  "plotly"
> = {
  highlighted: "Highlighted",
  multiline: "Multiline",
  envelope: "Envelope",
  // plotly: "Plotly",
};
export const clusterAssignmentOrientationOptions: Record<
  StreamClustersSettings["clusterAssignmentOrientation"],
  React.ReactNode
> = {
  vertical: <SeparatorVertical />,
  horizontal: <SeparatorHorizontal />,
};

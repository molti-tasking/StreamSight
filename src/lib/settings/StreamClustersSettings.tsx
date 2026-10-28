import { SeparatorVertical, SeparatorHorizontal } from "lucide-react";
import { z } from "zod";

export const streamClustersSettingsSchema = z.object({
  layoutMode: z.enum(["treemap", "grid", "list", "baseline", "clusterMap"]),
  showClusterAssignments: z.coerce.boolean<boolean>(),
  clusterAssignmentHistoryDepth: z.coerce.number<number>(),
  clusterAssignmentOrientation: z.enum(["vertical", "horizontal"]),
  treemapSignificanceMode: z.enum(["clusterSize", "clusterVariance"]),
  clusterOrderMode: z.enum(["stable", "size", "variance", "churn"]),
  animateTransitions: z.coerce.boolean<boolean>(),
  chartMode: z.enum(["highlighted", "multiline", "envelope", "plotly"]),
  showStreamLabel: z.coerce.boolean<boolean>(),
  showClusterLegend: z.coerce.boolean<boolean>(),
});

export type StreamClustersSettings = z.infer<
  typeof streamClustersSettingsSchema
>;

// The "treemap" layout is a flat, size-proportional tiling (no hierarchy),
// so the UI calls it "Proportional tiles"; the internal id stays.
export const layoutViewOptions: Record<StreamClustersSettings["layoutMode"], string> = {
  list: "List",
  grid: "Grid",
  treemap: "Proportional tiles",
  baseline: "Baseline (box plots)",
  clusterMap: "Cluster map (over time)",
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

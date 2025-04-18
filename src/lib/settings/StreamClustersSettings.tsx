import { SeparatorHorizontal, SeparatorVertical } from "lucide-react";
import { z } from "zod";

const baselineValuesSchema = z.record(z.string(), z.number()).optional();

export const streamClustersSettingsSchema = z.object({
  layoutMode: z.enum(["treemap", "grid", "list", "baseline", "clusterMap"]),
  showClusterAssignments: z.coerce.boolean(),
  baseline: z.date().nullable(),
  baselineValues: baselineValuesSchema,
  clusterAssignmentHistoryDepth: z.coerce.number(),
  clusterAssignmentOrientation: z.enum(["vertical", "horizontal"]),
  treemapSignificanceMode: z.enum(["clusterSize", "clusterVariance"]),
  chartMode: z.enum(["multiline", "highlighted", "envelope", "plotly"]),
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
  list: "List",
  grid: "Grid",
  treemap: "Treemap",
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
  multiline: "Multiline",
  highlighted: "Highlighted",
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

import { z } from "zod";

export const streamClustersSettingsSchema = z.object({
  layoutMode: z.enum(["treeMap", "grid", "list", "clusterMap"]),
  showClusterAssignments: z.coerce.boolean(),
  clusterAssignmentHistoryDepth: z.coerce.number(),
  clusterAssignmentOrientation: z.enum(["vertical", "horizontal"]),
  treeMapSignificanceMode: z.enum(["clusterSize", "clusterVariance"]),
  chartMode: z.enum(["highlighted", "multiline", "envelope", "plotly"]),
});

export type StreamClustersSettings = z.infer<
  typeof streamClustersSettingsSchema
>;

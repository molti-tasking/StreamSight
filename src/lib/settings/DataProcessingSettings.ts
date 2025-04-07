// NOTE: Previous settings type definition moved to new schema below.
// Kept for reference during implementation of the Zod schema.

import { z } from "zod";

const manualClusterAssignmentSchema = z.record(z.string(), z.number());

export const dataProcessingSettingsSchema = z.object({
  clusteringMode: z.enum(["automatic", "manual"]),
  manualClusterAssignments: manualClusterAssignmentSchema,
  eps: z.coerce.number(),

  /**
   * Period from now in ms that should be displayed
   */
  monitoringPeriod: z.coerce.number().optional(),

  // ignoreBoringDataMode: z.enum(["off", "standard"]),
  // meanRange: z.coerce.number().optional(),
  // tickRange: z.coerce.number().optional(),
  // saveScreenSpace: z.boolean().optional(),
});

export type DataProcessingSettings = z.infer<
  typeof dataProcessingSettingsSchema
>;

export const clusteringModeOptions: Record<
  DataProcessingSettings["clusteringMode"],
  string
> = {
  automatic: "Automatic (DBSCAN)",
  manual: "Manual Assignment",
};

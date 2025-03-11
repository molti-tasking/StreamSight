// export type ChartPresentationSettings = (
//   | {
//       clusterCount: number;
//     }
//   | {
//       /**
//        * A number between 0 and 1 to be used as a percentage and based on it there will be different clusters created, but the resulting cluster count will be unknown
//        */
//       eps: number;
//     }
// ) &
//   (
//     | object
//     | {
//         /**
//          * This value is a threshold. Whenever one of the values of a given range is outside of the a relative range apart from the mean, it will be considered as significant. Should be a number between 0 and 1.
//          *
//          */
//         meanRange: number;
//         /**
//          * Ticks to be taken into account for the check if there is a relevant threshold. Should be at least 3.
//          * @default 3
//          */
//         tickRange: number;

//         /**
//          * This should indicate that the screen space should be saved be not displaying boring data.
//          */
//         saveScreenSpace: boolean;
//       }
//   ) & {
//     /**
//      * The amount of cluster assignment history depth. Only applicable for chart view to decide how many stages should be displayed
//      */
//     clusterAssignmentHistoryDepth?: number;

//     /**
//      * Right now it may not make so much sense to mix a visual presentation with a technology. But we do not want to overcomplicate it right now.
//      */
//     mode: "clusters" | "multiline" | "envelope" | "plotly" | "highlighted";

//     dataTicks?: number;
//     timeScale?: { from: number; to: number };

//     ignoreBoringDataMode: "off" | "standard";
//   };

import { z } from "zod";

export const dataProcessingSettingsSchema = z.object({
  eps: z.coerce.number(),
  dataTicks: z.coerce.number().optional(),
  timeScale: z
    .object({
      from: z.coerce.number(),
      to: z.coerce.number(),
    })
    .optional(),
  ignoreBoringDataMode: z.enum(["off", "standard"]),

  meanRange: z.coerce.number().optional(),
  tickRange: z.coerce.number().optional(),
  saveScreenSpace: z.boolean().optional(),
});

export type DataProcessingSettings = z.infer<
  typeof dataProcessingSettingsSchema
>;

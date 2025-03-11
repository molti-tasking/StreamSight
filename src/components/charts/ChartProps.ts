import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";
import { ClassValue } from "clsx";

export type ChartProps = {
  values: Record<string, number>[];
  className: ClassValue;
  yDomain: [number, number];
  saveScreenSpace?: boolean;
  mode: DataProcessingSettings["mode"];
};

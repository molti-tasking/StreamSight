import { StreamClustersSettings } from "@/lib/settings/StreamClustersSettings";
import { ClassValue } from "clsx";

export type ChartProps = {
  values: Record<string, number>[];
  className?: ClassValue;
  yDomain?: [number, number];
  saveScreenSpace?: boolean;
  mode: StreamClustersSettings["chartMode"];
  baselineValues?: StreamClustersSettings["baselineValues"];
};

import { StreamClustersSettings } from "@/lib/settings/StreamClustersSettings";
import { ClassValue } from "clsx";

export type ChartProps = {
  values: Record<string, number>[];
  className?: ClassValue;
  yDomain: [number, number];
  saveScreenSpace?: boolean;
  mode: StreamClustersSettings["chartMode"];
  /** Anomalies of this cluster in the window (markers at their timestamps). */
  anomalies?: { timestamp: number; label: string }[];
};

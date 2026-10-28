import * as Comlink from "comlink";
import type { ClusteringApi } from "./clustering.worker";

// Two lazily created workers running the same module: one for the live view,
// one for the (longer) clusters-over-time series, so the series never delays
// a live update. Guarded so they are never constructed during SSR.
const clients: Partial<Record<"live" | "overTime", Comlink.Remote<ClusteringApi>>> = {};

const getClient = (role: "live" | "overTime"): Comlink.Remote<ClusteringApi> => {
  if (typeof window === "undefined") {
    throw new Error("Clustering worker is only available in the browser.");
  }
  if (!clients[role]) {
    const worker = new Worker(new URL("./clustering.worker.ts", import.meta.url), {
      type: "module",
      name: `clustering-${role}`,
    });
    clients[role] = Comlink.wrap<ClusteringApi>(worker);
  }
  return clients[role]!;
};

export const getClusteringClient = () => getClient("live");
export const getOverTimeClusteringClient = () => getClient("overTime");

import * as Comlink from "comlink";
import type { ClusteringApi } from "./clustering.worker";

// Lazily create a single shared clustering worker on the client. Guarded so it
// is never constructed during SSR / on the server.
let client: Comlink.Remote<ClusteringApi> | null = null;

export const getClusteringClient = (): Comlink.Remote<ClusteringApi> => {
  if (typeof window === "undefined") {
    throw new Error("Clustering worker is only available in the browser.");
  }
  if (!client) {
    const worker = new Worker(
      new URL("./clustering.worker.ts", import.meta.url),
      { type: "module" }
    );
    client = Comlink.wrap<ClusteringApi>(worker);
  }
  return client;
};

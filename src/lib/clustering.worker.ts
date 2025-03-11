import * as Comlink from "comlink";
import { aggregator } from "./clustering";
import { clusteringOverTime } from "./clusteringOverTime";
import { highlighter } from "./highlighting";

// Define the functions that will be available in the worker
const workerFunctions = {
  aggregator: aggregator,
  highlighter: highlighter,
  clusteringOverTime: clusteringOverTime,
};

export type ClusteringWorker = typeof workerFunctions;

// Expose the worker functions to the main thread
Comlink.expose(workerFunctions);

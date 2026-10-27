/**
 * Loads the Node build (`pkg-node`) of the clustering WASM for tests and
 * benchmarks. App code uses the browser build inside the clustering worker.
 * Requires `yarn build:wasm` (the generated packages are not committed).
 */
import { createRequire } from "node:module";
import type * as WasmModule from "../../../backend/rust_wasm_module/pkg-node/rust_wasm_module.js";
import type { AggregatedProps, ClusteringSettings, ClusterRow } from "./clusterTypes";

const require = createRequire(import.meta.url);

export const wasm = require(
  "../../../backend/rust_wasm_module/pkg-node/rust_wasm_module.js"
) as typeof WasmModule;

/** Typed wrapper around the WASM `aggregator`. */
export const aggregate = (
  rows: ClusterRow[],
  dimensions: string[],
  settings: Partial<ClusteringSettings>
): AggregatedProps => wasm.aggregator(rows, dimensions, settings) as AggregatedProps;

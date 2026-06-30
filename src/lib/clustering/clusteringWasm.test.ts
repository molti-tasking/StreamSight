import { expect, test } from "vitest";
import { createRequire } from "node:module";
import {
  inputValues,
  dimensions,
  settings,
  expectedResult,
} from "../../app/actions/__fixtures__/clusteringGolden";

// The WASM module is built (wasm-pack) into pkg-node for Node/vitest. The app
// itself uses the `web` target via the clustering Web Worker; the algorithm is
// identical, so this test pins the WASM output against the original JS golden
// result to guarantee the port did not change any clustering behaviour.
const require = createRequire(import.meta.url);
const wasm = require(
  "../../../backend/rust_wasm_module/pkg-node/rust_wasm_module.js"
) as {
  aggregator: (
    rawData: unknown,
    dimensions: unknown,
    settings: unknown
  ) => {
    aggregated: Record<string, number>[][];
    yDomain: [number, number];
    clusterAssignment: [string, number][];
  };
};

test("WASM aggregator matches the original JS clustering golden output", () => {
  const result = wasm.aggregator(inputValues, dimensions, {
    dataTicks: settings.dataTicks,
    eps: settings.eps,
  });

  expect(result.aggregated.length).toBe(expectedResult.aggregated.length);
  expect(result.clusterAssignment).toStrictEqual(
    expectedResult.clusterAssignment
  );
  expect(result.yDomain).toStrictEqual(expectedResult.yDomain);
  // Full structural equality (object key order is irrelevant to toStrictEqual).
  expect(result.aggregated).toStrictEqual(expectedResult.aggregated);
});

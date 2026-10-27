import { expect, test } from "vitest";
import { createRequire } from "node:module";
import {
  inputValues,
  dimensions,
  settings,
} from "../../app/actions/__fixtures__/clusteringGolden";
import { assembleClusters, OUTLIER_ID } from "./assembleClusters";
import type { ClusterRow } from "./clusterTypes";

// Same WASM handle the golden test uses (pkg-node target for Node/vitest).
const require = createRequire(import.meta.url);
const wasm = require(
  "../../../backend/rust_wasm_module/pkg-node/rust_wasm_module.js"
) as {
  aggregator: (
    rawData: unknown,
    dimensions: unknown,
    settings: unknown
  ) => {
    aggregated: ClusterRow[][];
    yDomain: [number, number];
    clusterAssignment: [string, number][];
  };
};

// The WASM aggregator slices to the most recent `dataTicks` rows internally;
// the JS assembly works on an already-windowed slice, so replicate that here.
const window = inputValues.slice(-settings.dataTicks);

test("assembleClusters reproduces the WASM aggregator byte-for-byte", () => {
  const wasmResult = wasm.aggregator(inputValues, dimensions, {
    dataTicks: settings.dataTicks,
    eps: settings.eps,
  });

  const assignment = new Map<string, number>(wasmResult.clusterAssignment);
  const assembled = assembleClusters(window, dimensions, assignment);

  expect(assembled.clusterAssignment).toStrictEqual(
    wasmResult.clusterAssignment
  );
  expect(assembled.yDomain).toStrictEqual(wasmResult.yDomain);
  expect(assembled.aggregated).toStrictEqual(wasmResult.aggregated);
});

test("clusterIds are index-aligned with the assembled clusters", () => {
  const wasmResult = wasm.aggregator(inputValues, dimensions, {
    dataTicks: settings.dataTicks,
    eps: settings.eps,
  });
  const assignment = new Map<string, number>(wasmResult.clusterAssignment);
  const assembled = assembleClusters(window, dimensions, assignment);

  // Each assembled cluster's key must match the position its members report.
  expect(assembled.clusterIds.length).toBe(assembled.aggregated.length);
  for (const [dim, position] of assembled.clusterAssignment) {
    if (position < 0) continue;
    const memberCluster = assembled.aggregated[position];
    expect(memberCluster.some((row) => dim in row)).toBe(true);
  }
});

test("outlier (OUTLIER_ID) dimensions form a trailing noise cluster", () => {
  const assignment = new Map<string, number>([
    [dimensions[0], 0],
    [dimensions[1], OUTLIER_ID],
    [dimensions[2], 0],
  ]);
  const assembled = assembleClusters(
    window,
    dimensions.slice(0, 3),
    assignment
  );

  // One real cluster + one appended outliers cluster.
  expect(assembled.aggregated).toHaveLength(2);
  expect(assembled.clusterIds[assembled.clusterIds.length - 1]).toBe(
    OUTLIER_ID
  );
  // The outlier stream lives in the last (outliers) cluster, not the first.
  const outlierCluster = assembled.aggregated[assembled.aggregated.length - 1];
  expect(outlierCluster.some((row) => dimensions[1] in row)).toBe(true);
  expect(assembled.aggregated[0].some((row) => dimensions[1] in row)).toBe(
    false
  );
});

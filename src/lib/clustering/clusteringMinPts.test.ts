import { expect, test } from "vitest";
import { createRequire } from "node:module";

// Exercises the corrected DBSCAN path (minPts > 0) which labels outliers as
// cluster index -1. The legacy path (minPts omitted) is pinned separately by
// clusteringWasm.test.ts and must stay byte-identical.
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

// Three tightly-grouped streams (A, B, C) and one far-away outlier (D).
const dimensions = ["A", "B", "C", "D"];
const inputValues = [
  { timestamp: 0, A: 1.0, B: 1.1, C: 0.9, D: 50 },
  { timestamp: 1, A: 1.0, B: 1.0, C: 1.1, D: 50 },
  { timestamp: 2, A: 1.0, B: 0.9, C: 1.0, D: 50 },
];

test("minPts path labels a lone stream as noise (-1)", () => {
  const result = wasm.aggregator(inputValues, dimensions, {
    eps: 5,
    dataTicks: 3,
    minPts: 3,
  });

  const assignment = Object.fromEntries(result.clusterAssignment);
  // The outlier is noise...
  expect(assignment.D).toBe(-1);
  // ...and the three close streams share one (non-noise) cluster.
  expect(assignment.A).toBeGreaterThanOrEqual(0);
  expect(assignment.A).toBe(assignment.B);
  expect(assignment.B).toBe(assignment.C);
  // Exactly one cluster, containing exactly A, B, C.
  expect(result.aggregated).toHaveLength(1);
});

test("minPts=0 / omitted keeps the legacy behavior (no noise)", () => {
  const result = wasm.aggregator(inputValues, dimensions, {
    eps: 5,
    dataTicks: 3,
  });
  const assignment = Object.fromEntries(result.clusterAssignment);
  // Legacy DBSCAN absorbs every stream into some cluster — none are noise.
  for (const dim of dimensions) {
    expect(assignment[dim]).toBeGreaterThanOrEqual(0);
  }
});

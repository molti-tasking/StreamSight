import { expect, test } from "vitest";
import { createRequire } from "node:module";

// DBSCAN noise labelling: streams that are neither core points nor
// density-reachable from one get cluster index -1.
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

test("omitted minPts defaults to 2: an isolated stream is still noise", () => {
  const result = wasm.aggregator(inputValues, dimensions, {
    eps: 5,
    dataTicks: 3,
  });
  const assignment = Object.fromEntries(result.clusterAssignment);
  expect(assignment.D).toBe(-1);
  expect(assignment.A).toBe(0);
  expect(assignment.B).toBe(0);
  expect(assignment.C).toBe(0);
});

test("minPts larger than any neighbourhood makes every stream noise", () => {
  const result = wasm.aggregator(inputValues, dimensions, {
    eps: 5,
    dataTicks: 3,
    minPts: 5,
  });
  for (const [, cluster] of result.clusterAssignment) expect(cluster).toBe(-1);
  expect(result.aggregated).toHaveLength(0);
});

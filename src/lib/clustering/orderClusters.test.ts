import { expect, test } from "vitest";
import { orderClusters, clusterVariance } from "./orderClusters";
import type { ClusterRow } from "./clusterTypes";
import type { HighlightInfo } from "./highlighting";

// Two clusters: A has 1 stream, B has 3 streams; B is also more variable.
const aggregated: ClusterRow[][] = [
  [
    { timestamp: 0, A: 10 },
    { timestamp: 1, A: 10 },
  ],
  [
    { timestamp: 0, B: 0, C: 5, D: 100 },
    { timestamp: 1, B: 50, C: 5, D: 0 },
  ],
];
const clusterIds = [0, 1];
const noHighlight: HighlightInfo[][] = [[], []];

test("size mode puts the larger cluster first", () => {
  const r = orderClusters(aggregated, clusterIds, noHighlight, "size");
  expect(r.clusterIds).toEqual([1, 0]);
});

test("stable mode keeps ascending id order", () => {
  const r = orderClusters(aggregated, clusterIds, noHighlight, "stable");
  expect(r.clusterIds).toEqual([0, 1]);
});

test("variance mode ranks the more variable cluster first", () => {
  expect(clusterVariance(aggregated[1])).toBeGreaterThan(
    clusterVariance(aggregated[0])
  );
  const r = orderClusters(aggregated, clusterIds, noHighlight, "variance");
  expect(r.clusterIds[0]).toBe(1);
});

test("outliers (id < 0) are always placed last", () => {
  const withOutlier: ClusterRow[][] = [
    [{ timestamp: 0, A: 1, B: 2, C: 3 }], // big cluster
    [{ timestamp: 0, Z: 9 }], // outlier
  ];
  const r = orderClusters(withOutlier, [0, OUTLIER], noHighlight, "size");
  expect(r.clusterIds[r.clusterIds.length - 1]).toBe(OUTLIER);
});

const OUTLIER = -1;

test("reordering keeps clusterIds and highlightInfo aligned", () => {
  const highlight: HighlightInfo[][] = [
    [{ dimension: "A", opacity: 0.1, lastDimension: undefined }],
    [{ dimension: "B", opacity: 0.9, lastDimension: 0 }],
  ];
  const r = orderClusters(aggregated, clusterIds, highlight, "churn");
  // Cluster 1 has higher total opacity -> first, and its highlight travels with it.
  expect(r.clusterIds[0]).toBe(1);
  expect(r.highlightInfo[0][0].dimension).toBe("B");
});

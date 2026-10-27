import { expect, test } from "vitest";
import { detectAnomalies, regimeChangeEvents } from "./detectAnomalies";
import type { ClusterRow } from "../clustering/clusterTypes";

function steady(key: string, base: number, n: number, last: number): ClusterRow[] {
  const rows: ClusterRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({ timestamp: i, [key]: i === n - 1 ? last : base + (i % 2) * 0.1 });
  }
  return rows;
}

test("flags a clear spike on the latest point", () => {
  const cluster = steady("A", 10, 8, 1000); // last point jumps to 1000
  const events = detectAnomalies([cluster], [0], { zThreshold: 3.5 });
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe("spike");
  expect(events[0].dimension).toBe("A");
  expect(events[0].clusterId).toBe(0);
  expect(events[0].label).toContain("spike");
});

test("flags a drop and reports the cluster id", () => {
  const cluster = steady("B", 100, 8, 1); // last point collapses to 1
  const events = detectAnomalies([cluster], [7], { zThreshold: 3.5 });
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe("drop");
  expect(events[0].clusterId).toBe(7);
});

test("does not flag a steady stream", () => {
  const cluster = steady("C", 10, 8, 10.05);
  const events = detectAnomalies([cluster], [0], { zThreshold: 3.5 });
  expect(events).toHaveLength(0);
});

test("ignores clusters with too few points", () => {
  const cluster: ClusterRow[] = [
    { timestamp: 0, A: 1 },
    { timestamp: 1, A: 1000 },
  ];
  expect(detectAnomalies([cluster], [0], { minPoints: 5 })).toHaveLength(0);
});

test("regimeChangeEvents reports membership moves", () => {
  const events = regimeChangeEvents(
    [[{ dimension: "A", opacity: 0.5, lastDimension: 2 }]],
    [0],
    123
  );
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe("regime-change");
  expect(events[0].timestamp).toBe(123);
  expect(events[0].label).toContain("cluster 2");
});

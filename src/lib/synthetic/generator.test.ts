import { expect, test } from "vitest";
import { generateSynthetic } from "./generator";

test("the same seed always gives the same data", () => {
  const a = generateSynthetic({ seed: 3, nStreams: 10, nTicks: 20, nClusters: 2 });
  const b = generateSynthetic({ seed: 3, nStreams: 10, nTicks: 20, nClusters: 2 });
  const c = generateSynthetic({ seed: 4, nStreams: 10, nTicks: 20, nClusters: 2 });
  expect(a.rows).toStrictEqual(b.rows);
  expect(a.rows).not.toStrictEqual(c.rows);
});

test("shape: rows, dimensions, labels and timestamps", () => {
  const ds = generateSynthetic({
    seed: 1,
    nStreams: 12,
    nTicks: 30,
    nClusters: 3,
    outlierStreams: 2,
    startTime: 1000,
    intervalMs: 250,
  });
  expect(ds.dimensions).toHaveLength(12);
  expect(ds.rows).toHaveLength(30);
  expect(ds.rows[1].timestamp - ds.rows[0].timestamp).toBe(250);
  expect(ds.rows[0].timestamp).toBe(1000);
  expect(ds.truth.labels.filter((l) => l === -1)).toHaveLength(2);
  expect(new Set(ds.truth.labels.filter((l) => l >= 0))).toEqual(new Set([0, 1, 2]));
});

test("missingRate omits values from rows", () => {
  const ds = generateSynthetic({ seed: 2, nStreams: 50, nTicks: 40, nClusters: 2, missingRate: 0.2 });
  const present = ds.rows.reduce((n, row) => n + Object.keys(row).length - 1, 0);
  expect(present / (50 * 40)).toBeGreaterThan(0.7);
  expect(present / (50 * 40)).toBeLessThan(0.9);
});

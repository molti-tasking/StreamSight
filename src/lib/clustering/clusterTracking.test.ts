import { expect, test } from "vitest";
import { ClusterTracker, overlapCoefficient } from "./clusterTracking";

test("overlapCoefficient normalizes by the smaller set", () => {
  expect(overlapCoefficient(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  expect(overlapCoefficient(new Set(["a"]), new Set(["a", "b", "c"]))).toBe(1);
  expect(overlapCoefficient(new Set(["a", "b"]), new Set(["b", "c"]))).toBe(0.5);
  expect(overlapCoefficient(new Set(["a"]), new Set(["x"]))).toBe(0);
});

test("stable ids persist while membership is unchanged", () => {
  const t = new ClusterTracker();
  const a = t.track([["c1", "c2"], ["c3"]]);
  const b = t.track([["c1", "c2"], ["c3"]]);
  expect(a).toEqual(b);
});

test("reordered clusters keep their ids", () => {
  const t = new ClusterTracker();
  const first = t.track([["c1", "c2"], ["c3", "c4"]]); // ids 0,1
  // Same two clusters, emitted in the opposite order next tick.
  const second = t.track([["c3", "c4"], ["c1", "c2"]]);
  expect(second).toEqual([first[1], first[0]]);
});

test("a newly appearing cluster gets a fresh id", () => {
  const t = new ClusterTracker();
  t.track([["c1", "c2"]]); // id 0
  const next = t.track([["c1", "c2"], ["c3", "c4"]]);
  expect(next[0]).toBe(0);
  expect(next[1]).toBe(1);
});

test("on a split, the larger child keeps the id", () => {
  const t = new ClusterTracker();
  const start = t.track([["c1", "c2", "c3", "c4"]]); // id 0
  const split = t.track([
    ["c1", "c2", "c3"], // larger child -> keeps 0
    ["c4"], // smaller child -> new id
  ]);
  expect(split[0]).toBe(start[0]);
  expect(split[1]).not.toBe(start[0]);
});

test("on a merge, only one survivor keeps an id (lower id wins)", () => {
  const t = new ClusterTracker();
  t.track([["c1", "c2"], ["c3", "c4"]]); // ids 0, 1
  const merged = t.track([["c1", "c2", "c3", "c4"]]);
  // The merged cluster overlaps both equally (coeff 1 vs each smaller set);
  // tie-break keeps the lower id.
  expect(merged[0]).toBe(0);
});

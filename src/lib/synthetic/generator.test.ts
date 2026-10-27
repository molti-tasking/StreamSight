import { expect, test } from "vitest";
import { generateSynthetic, truthForWindow } from "./generator";

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

test("switches and anomalies are recorded with tick and time, and leave the base data unchanged", () => {
  const base = generateSynthetic({ seed: 9, nStreams: 20, nTicks: 200, nClusters: 3 });
  const ds = generateSynthetic({
    seed: 9,
    nStreams: 20,
    nTicks: 200,
    nClusters: 3,
    membershipSwitches: 4,
    anomalies: 5,
    intervalMs: 500,
  });
  expect(ds.truth.switches).toHaveLength(4);
  expect(ds.truth.anomalies).toHaveLength(5);
  for (const sw of ds.truth.switches) {
    expect(sw.from).not.toBe(sw.to);
    expect(sw.atTime).toBe(sw.atTick * 500);
    expect(sw.atTick).toBeGreaterThanOrEqual(40);
  }
  // Streams without any event are identical to the event-free run.
  const touched = new Set([
    ...ds.truth.switches.map((s) => s.stream),
    ...ds.truth.anomalies.map((a) => a.stream),
  ]);
  const untouched = ds.dimensions.find((d) => !touched.has(d))!;
  expect(ds.rows.map((r) => r[untouched])).toEqual(base.rows.map((r) => r[untouched]));
});

test("an injected spike is several standard deviations above the stream", () => {
  const ds = generateSynthetic({ seed: 4, nStreams: 5, nTicks: 300, nClusters: 1, anomalies: 1 });
  const [anomaly] = ds.truth.anomalies;
  const values = ds.rows.map((r) => r[anomaly.stream]);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const deviation = (values[anomaly.atTick] - mean) / std;
  expect(Math.sign(deviation)).toBe(Math.sign(anomaly.magnitude));
  expect(Math.abs(deviation)).toBeGreaterThan(3);
});

test("truthForWindow follows switches and marks streams that switch inside the window", () => {
  const ds = generateSynthetic({ seed: 2, nStreams: 12, nTicks: 300, nClusters: 3, membershipSwitches: 1 });
  const [sw] = ds.truth.switches;
  const i = ds.dimensions.indexOf(sw.stream);
  const before = truthForWindow(ds, sw.atTick - 1, 50);
  expect(before.labels[i]).toBe(sw.from);
  expect(before.ambiguous[i]).toBe(false);
  const during = truthForWindow(ds, sw.atTick + 10, 50);
  expect(during.labels[i]).toBe(sw.to);
  expect(during.ambiguous[i]).toBe(true);
  const after = truthForWindow(ds, sw.atTick + 60, 50);
  expect(after.ambiguous[i]).toBe(false);
  expect(after.labels[i]).toBe(sw.to);
});

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MAX_CATCH_UP, rowDelayMs, rowsDue, usePlaybackStore } from "./usePlaybackStore";
import { useRawDataStore } from "./useRawDataStore";

const source = {
  kind: "synthetic" as const,
  config: { seed: 1, nStreams: 4, nTicks: 20, nClusters: 2, intervalMs: 100 },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
});
afterEach(() => {
  usePlaybackStore.getState().pause();
  vi.useRealTimers();
});

test("speed divides the native interval; max has no delay", () => {
  expect(rowDelayMs("native", 131.072)).toBe(131.072);
  expect(rowDelayMs(2, 100)).toBe(50);
  expect(rowDelayMs(10, 100)).toBe(10);
  expect(rowDelayMs("max", 100)).toBe(0);
});

test("plays at the native interval, pauses, steps and stops at the end", async () => {
  await usePlaybackStore.getState().load(source, { autoplay: false });
  expect(usePlaybackStore.getState()).toMatchObject({ status: "paused", total: 20, position: 0 });
  expect(useRawDataStore.getState().dimensions).toHaveLength(4);

  usePlaybackStore.getState().play(); // first row immediately
  expect(useRawDataStore.getState().values).toHaveLength(1);
  vi.advanceTimersByTime(450); // rows due at 100, 200, 300, 400 ms
  expect(usePlaybackStore.getState().position).toBe(5);

  usePlaybackStore.getState().pause();
  vi.advanceTimersByTime(1000);
  expect(usePlaybackStore.getState().position).toBe(5);

  usePlaybackStore.getState().step();
  expect(usePlaybackStore.getState()).toMatchObject({ status: "paused", position: 6 });

  usePlaybackStore.getState().setSpeed(10); // 10 ms per row
  usePlaybackStore.getState().play();
  vi.advanceTimersByTime(1000);
  expect(usePlaybackStore.getState()).toMatchObject({ status: "ended", position: 20 });
  // Rows arrive in order with the source's timestamps.
  const timestamps = useRawDataStore.getState().values.map((row) => row.timestamp);
  expect(timestamps).toEqual(Array.from({ length: 20 }, (_, i) => i * 100));
  usePlaybackStore.getState().setSpeed("native");
});

test("rows that fell due during a stall are delivered together", () => {
  // Clock started at 0 ms with one row per 100 ms; 1 row delivered so far.
  // A timer that fires late at 450 ms owes rows 100, 200, 300 and 400.
  expect(rowsDue(450, 0, 1, 100)).toBe(3);
  expect(rowsDue(450, 0, 0, 100)).toBe(4);
  expect(rowsDue(99, 0, 0, 100)).toBe(0);
  expect(MAX_CATCH_UP).toBeGreaterThan(100);
});

test("max fast-forwards in batches", async () => {
  await usePlaybackStore.getState().load(
    { kind: "synthetic", config: { ...source.config, nTicks: 120 } },
    { autoplay: false }
  );
  usePlaybackStore.getState().setSpeed("max");
  usePlaybackStore.getState().play();
  vi.advanceTimersByTime(60); // 1 row on play, then 50 per ~16 ms frame
  expect(usePlaybackStore.getState()).toMatchObject({ status: "ended", position: 120 });
  usePlaybackStore.getState().setSpeed("native");
});

test("exposes the synthetic ground truth", async () => {
  await usePlaybackStore.getState().load(
    { kind: "synthetic", config: { ...source.config, anomalies: 2, membershipSwitches: 1 } },
    { autoplay: false }
  );
  const { truth } = usePlaybackStore.getState();
  expect(truth?.anomalies).toHaveLength(2);
  expect(truth?.switches).toHaveLength(1);
});

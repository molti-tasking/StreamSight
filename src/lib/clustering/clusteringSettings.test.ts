import { expect, test } from "vitest";
import {
  buildClusteringSettings,
  DEFAULT_DATA_TICKS,
  selectedRange,
  selectWindow,
} from "./clusteringSettings";

const rows = Array.from({ length: 10 }, (_, i) => ({ timestamp: i * 1000, a: i }));

test("fills defaults for missing or non-positive values", () => {
  expect(buildClusteringSettings({ eps: 0.5 })).toEqual({
    eps: 0.5,
    minPts: 2,
    zNormalize: true,
    dataTicks: DEFAULT_DATA_TICKS,
  });
  expect(buildClusteringSettings({ eps: 1, dataTicks: 0, minPts: 0 })).toMatchObject({
    dataTicks: DEFAULT_DATA_TICKS,
    minPts: 1,
  });
});

test("passes through user settings and the selected range", () => {
  const range = { from: 2000, to: 5000 };
  expect(
    buildClusteringSettings({ eps: 3, minPts: 4, zNormalize: false, dataTicks: 20 }, range)
  ).toEqual({ eps: 3, minPts: 4, zNormalize: false, dataTicks: 20, timeScale: range });
});

test("selectedRange only reports a complete range in range mode", () => {
  expect(selectedRange({ mode: "latest", from: 1, to: 2 })).toBeUndefined();
  expect(selectedRange({ mode: "range", from: 1 })).toBeUndefined();
  expect(selectedRange({ mode: "range", from: 1, to: 2 })).toEqual({ from: 1, to: 2 });
});

test("selectWindow takes the last dataTicks rows, or the selected range", () => {
  expect(selectWindow(rows, { dataTicks: 3 }).map((r) => r.a)).toEqual([7, 8, 9]);
  expect(selectWindow(rows, { dataTicks: 0 })).toHaveLength(10);
  expect(selectWindow(rows, { dataTicks: 50 })).toHaveLength(10);
  expect(
    selectWindow(rows, { dataTicks: 3, timeScale: { from: 2000, to: 4000 } }).map((r) => r.a)
  ).toEqual([2, 3, 4]);
});

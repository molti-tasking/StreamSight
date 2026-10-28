import { expect, test } from "vitest";
import { timeAxisFormat, timeDomain } from "./timeAxis";

test("relative time is elapsed UTC time with a unit and no sub-second ticks", () => {
  expect(timeAxisFormat("relative", 30_000)).toEqual({
    format: "%M:%S",
    utc: true,
    title: "Elapsed (mm:ss)",
    tickMinStep: 1000,
  });
  expect(timeAxisFormat("relative", 2 * 3600_000).title).toBe("Elapsed (hh:mm:ss)");
});

test("absolute time format follows the visible span", () => {
  expect(timeAxisFormat("absolute", 50_000).title).toBe("Time (hh:mm:ss)");
  expect(timeAxisFormat("absolute", 3 * 3600_000).format).toBe("%H:%M");
  expect(timeAxisFormat("absolute", 30 * 24 * 3600_000).format).toBe("%Y-%m-%d");
});

test("timeDomain spans all clusters and ignores rows without a timestamp", () => {
  expect(timeDomain([[{ timestamp: 5 }, { timestamp: 9 }], [{ timestamp: 2 }, {}]])).toEqual([2, 9]);
  expect(timeDomain([])).toEqual([0, 1]);
});

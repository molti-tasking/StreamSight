import { expect, test } from "vitest";
import { scoreFlags } from "./scoreFlags";

const events = [
  { atTime: 10_000, kind: "spike" },
  { atTime: 30_000, kind: "switch" },
  { atTime: 50_000, kind: "drop" },
];

test("hits, misses, false alarms and time to detect", () => {
  const score = scoreFlags(events, [{ dataTime: 12_000 }, { dataTime: 20_000 }, { dataTime: 31_500 }], 5000);
  expect(score).toMatchObject({ events: 3, hits: 2, misses: 1, falseAlarms: 1 });
  expect(score.hitRate).toBeCloseTo(2 / 3);
  expect(score.timesToDetect).toEqual([2000, 1500]);
  expect(score.medianTimeToDetect).toBe(1500);
  expect(score.perEvent[2].detectedAt).toBeUndefined();
});

test("a flag before an event does not count, and one flag detects one event", () => {
  const close = [
    { atTime: 1000, kind: "a" },
    { atTime: 1500, kind: "b" },
  ];
  const score = scoreFlags(close, [{ dataTime: 900 }, { dataTime: 1600 }], 2000);
  expect(score.hits).toBe(1);
  expect(score.falseAlarms).toBe(1);
});

import { expect, test } from "vitest";
import { correlationForEps, defaultEps, rawEpsFor } from "./epsDefaults";

test("eps maps to the equivalent correlation threshold", () => {
  expect(correlationForEps(0)).toBe(1);
  expect(correlationForEps(Math.SQRT2)).toBeCloseTo(0);
  expect(correlationForEps(0.6)).toBeCloseTo(0.82);
});

test("z-normalized default is 0.6; raw default scales with the data", () => {
  expect(defaultEps(true)).toBe(0.6);
  // Two streams with standard deviation 10 and 30 -> median 30 (upper median).
  const rows = [
    { timestamp: 0, a: -10, b: -30 },
    { timestamp: 1, a: 10, b: 30 },
  ];
  expect(rawEpsFor(rows, ["a", "b"])).toBe(18);
  expect(defaultEps(false, rows, ["a", "b"])).toBe(18);
  expect(defaultEps(false)).toBe(1);
});

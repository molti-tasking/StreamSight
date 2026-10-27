import { expect, test } from "vitest";
import { correlationForEps, defaultEps } from "./epsDefaults";

test("eps maps to the equivalent correlation threshold", () => {
  expect(correlationForEps(0)).toBe(1);
  expect(correlationForEps(Math.SQRT2)).toBeCloseTo(0);
  expect(correlationForEps(0.6)).toBeCloseTo(0.82);
});

test("each distance mode has its own default eps", () => {
  expect(defaultEps(true)).toBeLessThan(Math.SQRT2);
  expect(defaultEps(false)).toBeGreaterThan(0);
});

import { expect, test } from "vitest";
import { adjustedRandIndex } from "./ari";

test("identical partitions score 1, regardless of label names", () => {
  expect(adjustedRandIndex([0, 0, 1, 1, 2], [0, 0, 1, 1, 2])).toBe(1);
  expect(adjustedRandIndex([0, 0, 1, 1, 2], [7, 7, 3, 3, 9])).toBe(1);
});

test("matches a hand-computed value", () => {
  // Contingency [[2,1],[0,2]]: index 2, row pairs 3+1, col pairs 1+3, n=5 (10 pairs)
  // expected = 4*4/10 = 1.6, max = 4 -> (2 - 1.6) / (4 - 1.6) = 1/6
  expect(adjustedRandIndex([0, 0, 0, 1, 1], [0, 0, 1, 1, 1])).toBeCloseTo(1 / 6, 12);
});

test("chance-level labelings score near 0 on average", () => {
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let total = 0;
  for (let r = 0; r < 50; r++) {
    const a = Array.from({ length: 200 }, () => Math.floor(rand() * 4));
    const b = Array.from({ length: 200 }, () => Math.floor(rand() * 4));
    total += adjustedRandIndex(a, b);
  }
  expect(Math.abs(total / 50)).toBeLessThan(0.02);
});

test("noise labels are singletons, so labelling a cluster as noise is penalised", () => {
  expect(adjustedRandIndex([-1, -1, 0, 0], [-1, -1, 0, 0])).toBe(1);
  expect(adjustedRandIndex([0, 0, 0, 0], [-1, -1, -1, -1])).toBe(0);
  expect(adjustedRandIndex([0, 0, 1, 1], [0, 0, -1, -1])).toBeLessThan(1);
});

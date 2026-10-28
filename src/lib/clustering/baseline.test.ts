import { expect, test } from "vitest";
import { changesSinceWindowStart } from "./baseline";

test("change is last minus first finite value per stream, skipping gaps", () => {
  const cluster: Record<string, number>[] = [
    { timestamp: 0, a: 10 },
    { timestamp: 1, a: 12, b: 5 },
    { timestamp: 2, a: 15, b: 4 },
    { timestamp: 3, b: 7 },
  ];
  expect(changesSinceWindowStart(cluster)).toEqual([
    { stream: "a", change: 5 },
    { stream: "b", change: 2 },
  ]);
});

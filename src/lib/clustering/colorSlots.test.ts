import { expect, test } from "vitest";
import { ColorSlots } from "./colorSlots";

test("concurrent clusters get distinct slots and keep them", () => {
  const slots = new ColorSlots(4);
  slots.update([0, 1, 2]);
  expect([0, 1, 2].map((id) => slots.slotOf(id))).toEqual([0, 1, 2]);
  // Cluster 1 disappears, 7 and 9 appear: 7 reuses slot 1, 9 takes slot 3.
  slots.update([0, 2, 7, 9]);
  expect(slots.slotOf(0)).toBe(0);
  expect(slots.slotOf(2)).toBe(2);
  expect(slots.slotOf(7)).toBe(1);
  expect(slots.slotOf(9)).toBe(3);
});

test("ids beyond the palette size do not collide while slots are free", () => {
  const slots = new ColorSlots(8);
  slots.update([3, 11]); // 3 % 8 === 11 % 8
  expect(slots.slotOf(3)).not.toBe(slots.slotOf(11));
});

test("a vanished cluster keeps its slot until another cluster claims it", () => {
  const slots = new ColorSlots(4);
  slots.update([0, 1]);
  slots.update([0]);
  expect(slots.slotOf(1)).toBe(1); // still drawn in its old colour
  slots.update([0, 5]);
  expect(slots.slotOf(5)).toBe(1);
});

test("noise (-1) never takes a slot", () => {
  const slots = new ColorSlots(4);
  slots.update([-1, 0]);
  expect(slots.slotOf(0)).toBe(0);
});

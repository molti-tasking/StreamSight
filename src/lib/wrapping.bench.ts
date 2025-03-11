import {
  calculateRelativeRangeA,
  calculateRelativeRangeB,
} from "./wrapping.js";

const inputValues = [
  8.1, 7.2, 6.952, 8.204, 3, 5.237, 5.322, 9.31, 5.84, 6.101, 6.102, 6.104,
  6.105, 6, 6, 6, 6, 6, 6, 91, 939, 2392, 3293, 293, 29329, 3923, 923, 293, 293,
  293, 293, 94029, 50934, 2394, 239, 402934, 2349, 20349, 2094, 20394, 20349,
  20394, 9,
];

// @ts-expect-error We only use this deno benchmarking locally to measure performance of different implementations
Deno.bench({
  name: "benchmark relative range a",
  fn() {
    calculateRelativeRangeA(...inputValues);
  },
});

// @ts-expect-error We only use this deno benchmarking locally to measure performance of different implementations
Deno.bench({
  name: "benchmark relative range b",
  fn() {
    calculateRelativeRangeB(...inputValues);
  },
});

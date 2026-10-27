// Headless scalability sweep for the StreamSight clustering core.
//
// Drives the *exact* WASM clustering the app uses (pkg-node target, same module
// as the golden test) over a grid of scalability dimensions and emits CSV to
// stdout. This isolates the compute half of the pipeline (DBSCAN over a window)
// with zero browser/render overhead, so the numbers are reproducible for the
// paper's scalability section (cf. Richer et al. 2022 scalability framework).
//
// Usage:
//   node bench/sweep.mjs > results.csv
//   node bench/sweep.mjs --streams 10,50,100,200,500 --ticks 20,50 --eps 15 \
//        --minpts 0,4 --rows 400 --repeats 5 --warmup 2
//
// All randomness is seeded, so re-running yields identical inputs (and thus
// comparable timings) across machines.

import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const wasm = require("../backend/rust_wasm_module/pkg-node/rust_wasm_module.js");

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  const nums = (v, fallback) =>
    v === undefined ? fallback : v.split(",").map(Number);
  return {
    streams: nums(args.streams, [10, 50, 100, 200, 500]),
    ticks: nums(args.ticks, [20, 50]),
    eps: nums(args.eps, [15]),
    // minPts: 0 means "legacy algorithm" (None on the Rust side); >0 uses the
    // corrected DBSCAN with a noise label once that feature lands.
    minpts: nums(args.minpts, [0]),
    rows: Number(args.rows ?? 400),
    repeats: Number(args.repeats ?? 5),
    warmup: Number(args.warmup ?? 2),
  };
}

// ---------------------------------------------------------------------------
// Seeded synthetic stream generator
// ---------------------------------------------------------------------------
// mulberry32: tiny, fast, deterministic PRNG so every run uses identical data.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build `rows` rows × `streams` columns with structured "levels" (bunches of
 * streams sharing a value band) plus seeded peaks/noise — mirrors the shape of
 * the app's peak simulator (useRawDataStore.generatePeakTestData) so DBSCAN sees
 * realistic, clusterable structure. Returns rows keyed by timestamp + "Col N".
 */
function generateStreams(streams, rows, seed = 1234) {
  const rng = mulberry32(seed);
  const dimensions = Array.from({ length: streams }, (_, i) => `Col ${i + 1}`);

  // Initial per-stream baselines arranged in jumping bands (clusterable).
  const jumpStep = 5;
  const jumpInterval = 10;
  let currentMin = 5;
  let currentMax = 10;
  const baselines = [];
  for (let i = 0; i < streams; i++) {
    baselines.push(rng() * (currentMax - currentMin) + currentMin);
    currentMin += 0.05;
    currentMax += 0.05;
    if ((i + 1) % jumpInterval === 0) {
      currentMin += jumpStep;
      currentMax += jumpStep;
    }
  }

  const startTime = 1730748224816;
  const values = [];
  let prev = baselines.slice();
  for (let r = 0; r < rows; r++) {
    const row = { timestamp: startTime + r * 1000 };
    const next = new Array(streams);
    for (let c = 0; c < streams; c++) {
      // Drift + occasional seeded peak.
      let v = prev[c] * (1 + (rng() - 0.5) * 0.03);
      if (rng() < 0.05) v = prev[c] * (1 + rng() * rng() * 0.5);
      next[c] = v;
      row[dimensions[c]] = v;
    }
    prev = next;
    values.push(row);
  }
  return { values, dimensions };
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------
function timeAggregator(values, dimensions, settings, repeats, warmup) {
  for (let i = 0; i < warmup; i++) {
    wasm.aggregator(values, dimensions, settings);
  }
  const samples = [];
  let clusterCount = 0;
  for (let i = 0; i < repeats; i++) {
    const t0 = performance.now();
    const result = wasm.aggregator(values, dimensions, settings);
    const t1 = performance.now();
    samples.push(t1 - t0);
    clusterCount = result.aggregated.length;
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  const p50 = samples[Math.floor(samples.length / 2)];
  return {
    clusterCount,
    mean,
    p50,
    min: samples[0],
    max: samples[samples.length - 1],
  };
}

// ---------------------------------------------------------------------------
// Main sweep
// ---------------------------------------------------------------------------
function main() {
  const cfg = parseArgs(process.argv);
  const cols = [
    "nStreams",
    "nRows",
    "dataTicks",
    "eps",
    "minPts",
    "repeats",
    "clusterCount",
    "computeMsMean",
    "computeMsP50",
    "computeMsMin",
    "computeMsMax",
  ];
  process.stdout.write(cols.join(",") + "\n");

  for (const streams of cfg.streams) {
    // Generate the largest window once per stream count; smaller windows slice.
    const { values, dimensions } = generateStreams(streams, cfg.rows);
    for (const ticks of cfg.ticks) {
      for (const eps of cfg.eps) {
        for (const minPts of cfg.minpts) {
          const settings = { eps, dataTicks: ticks };
          if (minPts > 0) settings.minPts = minPts; // ignored until A5 lands
          const r = timeAggregator(
            values,
            dimensions,
            settings,
            cfg.repeats,
            cfg.warmup
          );
          const line = [
            streams,
            cfg.rows,
            ticks,
            eps,
            minPts,
            cfg.repeats,
            r.clusterCount,
            r.mean.toFixed(4),
            r.p50.toFixed(4),
            r.min.toFixed(4),
            r.max.toFixed(4),
          ];
          process.stdout.write(line.join(",") + "\n");
        }
      }
    }
  }
}

main();

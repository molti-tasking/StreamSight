// Compute benchmark for the StreamSight clustering core (Node, no browser).
//
// Runs the WASM clustering the app uses (pkg-node build of the same crate) on
// seeded synthetic streams with known ground truth, so every row reports both
// cost and clustering quality (adjusted Rand index against the planted
// clusters). See bench/README.md for the meaning of every column.
//
//   node bench/sweep.mjs --mode scale > bench/results.csv
//   node bench/sweep.mjs --mode eps   > bench/results-eps.csv
//
// Options (comma lists where noted):
//   --streams 10,50,...  --ticks 20,50,100  --seeds 1,2,3  --sigma 0.3
//   --eps 0.6 --minpts 2 --clusters 5 --budget 15000 (ms per configuration)
//   --meta <path>  also write machine / Node / algorithm version / command
//
// Requires `yarn build:wasm`. Node >= 22.18 imports the shared TypeScript
// modules directly (type stripping).

import { writeFileSync } from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { generateSynthetic, truthForWindow } from "../src/lib/synthetic/generator.ts";
import { adjustedRandIndex } from "../src/lib/synthetic/ari.ts";
import { buildClusteringSettings, selectWindow } from "../src/lib/clustering/clusteringSettings.ts";
import { wasm } from "../src/lib/clustering/wasmNode.ts";

// --- arguments ---------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const list = (name, fallback) => String(arg(name, fallback)).split(",").map(Number);

const mode = arg("mode", "scale");
const seeds = list("seeds", "1,2,3");
const nClusters = Number(arg("clusters", 5));
const outlierShare = Number(arg("outliers", 0.02));
const budgetMs = Number(arg("budget", 15000));
const metaPath = arg("meta", undefined);

// --- helpers -----------------------------------------------------------------
const quantile = (sorted, q) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]; // nearest rank
const round = (v, digits = 4) => Number(v.toFixed(digits));

/** Dense series-major matrix (NaN = missing) for the window's rows. */
function dense(rows, dimensions) {
  const values = new Float64Array(dimensions.length * rows.length).fill(NaN);
  rows.forEach((row, t) =>
    dimensions.forEach((dim, i) => {
      const v = row[dim];
      if (Number.isFinite(v)) values[i * rows.length + t] = v;
    })
  );
  return values;
}

function dataset(nStreams, windowTicks, sigma, seed, transform = "affine") {
  const ds = generateSynthetic({
    seed,
    nStreams,
    nTicks: windowTicks,
    nClusters,
    noiseSigma: sigma,
    outlierStreams: Math.round(nStreams * outlierShare),
    ...(transform === "none" ? { scaleRange: [1, 1], offsetRange: [0, 0] } : {}),
  });
  const truth = truthForWindow(ds, windowTicks - 1, windowTicks).labels;
  return { ds, truth };
}

const csv = (columns, rows) =>
  [columns.join(","), ...rows.map((r) => columns.map((c) => r[c]).join(","))].join("\n") + "\n";

// --- scale sweep: cost and quality vs number of streams and window length ----
function scaleSweep() {
  const streams = list("streams", "10,50,100,200,500,1000,2000");
  const ticks = list("ticks", "20,50,100");
  const sigma = Number(arg("sigma", 0.3));
  const settings = buildClusteringSettings({
    eps: Number(arg("eps", 0.6)),
    minPts: Number(arg("minpts", 2)),
    zNormalize: arg("znorm", "true") === "true",
  });
  const rows = [];
  for (const nStreams of streams) {
    for (const windowTicks of ticks) {
      for (const seed of seeds) {
        const { ds, truth } = dataset(nStreams, windowTicks, sigma, seed);
        const window = selectWindow(ds.rows, { dataTicks: windowTicks });
        const s = { ...settings, dataTicks: windowTicks };
        const matrix = dense(window, ds.dimensions);

        // Warm-up, then repeat within the time budget (at least 5, at most 30).
        wasm.aggregator(window, ds.dimensions, s);
        const full = [];
        const core = [];
        let result;
        const start = performance.now();
        while (full.length < 30 && (full.length < 5 || performance.now() - start < budgetMs)) {
          let t0 = performance.now();
          result = wasm.aggregator(window, ds.dimensions, s);
          full.push(performance.now() - t0);
          t0 = performance.now();
          wasm.cluster_labels(matrix, nStreams, window.length, s.eps, s.minPts, s.zNormalize);
          core.push(performance.now() - t0);
        }
        full.sort((a, b) => a - b);
        core.sort((a, b) => a - b);
        const labels = result.clusterAssignment.map(([, c]) => c);
        rows.push({
          nStreams,
          nClusters,
          outlierStreams: ds.config.outlierStreams,
          windowTicks,
          noiseSigma: sigma,
          eps: s.eps,
          minPts: s.minPts,
          zNormalize: s.zNormalize,
          seed,
          repeats: full.length,
          clusterCount: result.aggregated.length,
          noiseCount: labels.filter((c) => c === -1).length,
          ari: round(adjustedRandIndex(truth, labels)),
          computeMsMean: round(full.reduce((a, b) => a + b, 0) / full.length),
          computeMsP50: round(quantile(full, 0.5)),
          computeMsP95: round(quantile(full, 0.95)),
          coreMsP50: round(quantile(core, 0.5)),
        });
        process.stderr.write(`scale n=${nStreams} ticks=${windowTicks} seed=${seed} done\n`);
      }
    }
  }
  return csv(Object.keys(rows[0]), rows);
}

// --- eps sensitivity: quality vs eps, per distance mode, minPts and noise ----
function epsSweep() {
  const nStreams = Number(arg("streams", 200));
  const ticks = list("ticks", "20,50,100");
  const sigmas = list("sigma", "0.3,0.5,0.8");
  const minPtsList = list("minpts", "2,3,4");
  const zGrid = Array.from({ length: 28 }, (_, i) => round(0.05 * (i + 1), 2));
  const variants = [
    // shape clustering (the default) on streams with different level/scale
    { zNormalize: true, transform: "affine", grid: zGrid },
    // raw distances on the same streams: level/scale differences dominate
    { zNormalize: false, transform: "affine", grid: [0.5, 1, 2, 5, 10, 20, 50, 100, 200] },
    // raw distances when all streams share level and scale (eps in data units)
    { zNormalize: false, transform: "none", grid: zGrid },
  ];
  const rows = [];
  for (const variant of variants) {
    for (const windowTicks of ticks) {
      for (const sigma of sigmas) {
        for (const seed of seeds) {
          const { ds, truth } = dataset(nStreams, windowTicks, sigma, seed, variant.transform);
          const prepared = new wasm.PreparedWindow(
            dense(ds.rows, ds.dimensions),
            nStreams,
            windowTicks,
            variant.zNormalize
          );
          for (const minPts of minPtsList) {
            for (const eps of variant.grid) {
              const labels = Array.from(prepared.dbscan(eps, minPts));
              rows.push({
                nStreams,
                nClusters,
                windowTicks,
                noiseSigma: sigma,
                transform: variant.transform,
                zNormalize: variant.zNormalize,
                minPts,
                eps,
                rEquiv: variant.zNormalize ? round(1 - (eps * eps) / 2, 3) : "",
                seed,
                clusterCount: new Set(labels.filter((c) => c >= 0)).size,
                noiseCount: labels.filter((c) => c === -1).length,
                ari: round(adjustedRandIndex(truth, labels)),
              });
            }
          }
          prepared.free();
        }
      }
    }
    process.stderr.write(`eps variant z=${variant.zNormalize} transform=${variant.transform} done\n`);
  }
  return csv(Object.keys(rows[0]), rows);
}

// --- run ---------------------------------------------------------------------
const output = mode === "eps" ? epsSweep() : scaleSweep();
process.stdout.write(output);

if (metaPath) {
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        command: `node bench/sweep.mjs ${argv.join(" ")}`,
        generatedAt: new Date().toISOString(),
        algoVersion: wasm.algo_version(),
        node: process.version,
        platform: `${os.platform()} ${os.release()} ${os.arch()}`,
        cpu: os.cpus()[0]?.model,
        cpuCount: os.cpus().length,
        memoryGB: round(os.totalmem() / 2 ** 30, 1),
      },
      null,
      2
    ) + "\n"
  );
}

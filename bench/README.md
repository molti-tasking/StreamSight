# Benchmarks

Every number below comes from a script in this directory and can be
regenerated with the commands listed. Each CSV has a `.meta.json` next to it
recording the machine, runtime, algorithm version and exact command of the
run that produced it.

## Setup

```sh
yarn install
yarn build:wasm                 # Rust -> pkg/ (browser) and pkg-node/ (Node)
# end-to-end benchmark only:
yarn build                      # production build used by bench/e2e.mjs
npx playwright install chromium # once per machine (Playwright 1.58.2 uses Chromium build 1208)
```

Node ≥ 22.18 is required: the scripts import the app's TypeScript modules
(`src/lib/synthetic/generator.ts`, `ari.ts`, `clusteringSettings.ts`,
`wasmNode.ts`) directly via Node's type stripping, so the benchmark runs
exactly the code the app runs.

## Machine and software of the committed results

| | |
|---|---|
| CPU | Apple M3 Pro, 12 cores |
| Memory | 18 GB |
| OS | macOS (Darwin 27.0.0), arm64 |
| Node | v22.23.2 |
| Browser (e2e) | Chromium 145.0.7632.6, headless, via Playwright 1.58.2, viewport 1440×900, device scale 1 |
| Clustering | `algo_version` `dbscan-rms-z-3` (textbook DBSCAN, RMS distance over shared ticks, per-stream z-normalization) |

The machine was otherwise idle during the timing runs (`results.csv`,
`results-e2e.csv`). `results-eps.csv` has no timing columns.

## Data

All benchmarks use the seeded synthetic generator the app also offers
(`src/lib/synthetic/generator.ts`): `nClusters` independent prototype signals
(AR(1) plus a sinusoid with a period of 8–40 ticks, unit variance); every
stream is its cluster's prototype plus white noise of standard deviation
`noiseSigma`, under its own scale (0.5–5) and offset (±50); 2% of the streams
are outliers that follow their own signal (ground-truth label −1). Two
members of a cluster correlate about `1 / (1 + noiseSigma²)`.

Clustering quality is the adjusted Rand index (ARI) between the planted
clusters and DBSCAN's labels (`src/lib/synthetic/ari.ts`); a DBSCAN noise
label counts as a singleton, so calling cluster members noise is penalised.

## `results.csv` — cost and quality vs. number of streams

```sh
yarn bench:compute   # node bench/sweep.mjs --mode scale --meta bench/results.meta.json > bench/results.csv
```

Grid: `nStreams` ∈ {10, 50, 100, 200, 500, 1000, 2000} × `windowTicks` ∈
{20, 50, 100} × seeds 1–3; 5 clusters, noise σ 0.3, eps 0.6, minPts 2,
z-normalized (the app's defaults).

| column | meaning |
|---|---|
| nStreams, nClusters, outlierStreams | streams in the window, planted clusters, planted outlier streams |
| windowTicks | rows in the clustering window |
| noiseSigma | white-noise standard deviation relative to the prototype |
| eps, minPts, zNormalize | clustering settings |
| seed | generator seed |
| repeats | timed runs (after one warm-up): at least 5, at most 30, within a 15 s budget |
| clusterCount, noiseCount | clusters found; streams labelled noise |
| ari | adjusted Rand index against the planted clusters |
| computeMsMean / P50 / P95 | duration of one full WASM `aggregator` call (rows in, clusters out, including (de)serialization of the rows), ms; percentiles are nearest-rank |
| coreMsP50 | median duration of DBSCAN alone on a dense matrix (`cluster_labels`), ms |

Summary (`node bench/summarize.mjs scale`, means over the three seeds):

| streams | window | mean ARI | clusters | compute p50 (ms) | compute p95 (ms) | DBSCAN core p50 (ms) |
|---|---|---|---|---|---|---|
| 10 | 20 | 1.000 | 5.0 | 0.16 | 0.35 | 0.00 |
| 10 | 50 | 1.000 | 5.0 | 0.29 | 0.39 | 0.00 |
| 10 | 100 | 1.000 | 5.0 | 0.56 | 0.65 | 0.01 |
| 50 | 20 | 1.000 | 5.0 | 0.73 | 0.91 | 0.03 |
| 50 | 50 | 1.000 | 5.0 | 1.76 | 2.12 | 0.05 |
| 50 | 100 | 1.000 | 5.0 | 3.65 | 4.45 | 0.10 |
| 100 | 20 | 1.000 | 5.0 | 1.58 | 1.91 | 0.10 |
| 100 | 50 | 1.000 | 5.0 | 3.80 | 4.24 | 0.20 |
| 100 | 100 | 1.000 | 5.0 | 7.62 | 8.29 | 0.36 |
| 200 | 20 | 1.000 | 5.0 | 2.95 | 3.44 | 0.37 |
| 200 | 50 | 1.000 | 5.0 | 7.13 | 7.98 | 0.74 |
| 200 | 100 | 1.000 | 5.0 | 14.92 | 17.92 | 1.45 |
| 500 | 20 | 0.925 | 4.7 | 8.10 | 8.96 | 2.26 |
| 500 | 50 | 1.000 | 5.0 | 19.42 | 23.56 | 4.52 |
| 500 | 100 | 1.000 | 5.0 | 38.54 | 41.08 | 8.44 |
| 1000 | 20 | 0.924 | 5.0 | 20.69 | 23.51 | 9.21 |
| 1000 | 50 | 1.000 | 5.0 | 47.85 | 53.95 | 18.58 |
| 1000 | 100 | 1.000 | 5.0 | 98.34 | 105.08 | 36.44 |
| 2000 | 20 | 0.870 | 6.0 | 64.71 | 81.41 | 40.82 |
| 2000 | 50 | 1.000 | 5.0 | 138.42 | 153.14 | 77.99 |
| 2000 | 100 | 1.000 | 5.0 | 269.28 | 293.55 | 144.64 |

Observations:

- Cost grows with streams² × window, as expected for DBSCAN over a full
  pairwise distance matrix. Up to 200 streams × 100 ticks one clustering
  takes < 18 ms (p95); 2000 streams × 100 ticks take ≈ 0.3 s.
- For small inputs most of the time is moving rows between JavaScript and
  WASM, not clustering (200 × 100: 14.9 ms total vs 1.45 ms DBSCAN). Passing
  a dense numeric array instead of row objects is the obvious next
  optimisation; it is not implemented.
- Short windows (20 ticks) with many streams occasionally merge two clusters
  (ARI 0.87–0.93 at ≥ 500 streams): over 20 points, some streams of
  unrelated prototypes correlate by chance and DBSCAN chains through them.
- These are Node timings of the WASM call. In the app the call also crosses
  the Web Worker boundary (structured clone); see the end-to-end numbers.

## `results-eps.csv` — eps sensitivity

```sh
yarn bench:eps   # node bench/sweep.mjs --mode eps --seeds 1,2,3,4,5 --meta bench/results-eps.meta.json > bench/results-eps.csv
```

200 streams (5 clusters, 4 outliers), windows 20/50/100, noise σ 0.3/0.5/0.8,
seeds 1–5, minPts 2/3/4, eps grid 0.05–1.40 (step 0.05). The distance matrix
is computed once per window and DBSCAN re-run per eps (`PreparedWindow`).
Three distance variants:

- `zNormalize=true, transform=affine`: the default (shape clustering) on
  streams with different levels and scales;
- `zNormalize=false, transform=affine`: raw distances on the same streams
  (eps grid 0.5–200 in data units);
- `zNormalize=false, transform=none`: raw distances when all streams share
  level and scale (eps in data units = units of the prototype's std).

| column | meaning |
|---|---|
| nStreams, nClusters, windowTicks, noiseSigma, seed | as above |
| transform | `affine`: per-stream scale and offset; `none`: all streams share level and scale |
| zNormalize, minPts, eps | clustering settings |
| rEquiv | for z-normalized distances, the minimum Pearson correlation of two streams within eps: 1 − eps²/2 |
| clusterCount, noiseCount, ari | as above |

Mean ARI over seeds, z-normalized, minPts 2 (`node bench/summarize.mjs eps`):

| eps | r ≥ | σ 0.3, w 20 | σ 0.5, w 20 | σ 0.8, w 20 | σ 0.3, w 50 | σ 0.5, w 50 | σ 0.8, w 50 | σ 0.3, w 100 | σ 0.5, w 100 | σ 0.8, w 100 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.30 | 0.95 | 0.76 | 0.00 | 0.00 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| 0.40 | 0.92 | 1.00 | 0.12 | 0.00 | 1.00 | 0.00 | 0.00 | 1.00 | 0.00 | 0.00 |
| 0.50 | 0.88 | 1.00 | 0.88 | 0.01 | 1.00 | 0.22 | 0.00 | 1.00 | 0.00 | 0.00 |
| 0.55 | 0.85 | 1.00 | 0.94 | 0.06 | 1.00 | 0.83 | 0.00 | 1.00 | 0.41 | 0.00 |
| **0.60** | **0.82** | **0.96** | **0.95** | 0.27 | **1.00** | **0.99** | 0.00 | **1.00** | **0.97** | 0.00 |
| 0.65 | 0.79 | 0.91 | 0.91 | 0.60 | 1.00 | 1.00 | 0.01 | 1.00 | 1.00 | 0.00 |
| 0.70 | 0.76 | 0.91 | 0.78 | 0.63 | 1.00 | 1.00 | 0.18 | 1.00 | 1.00 | 0.00 |
| 0.80 | 0.68 | 0.77 | 0.62 | 0.42 | 0.96 | 0.96 | 0.90 | 1.00 | 1.00 | 0.79 |
| 0.90 | 0.59 | 0.61 | 0.42 | 0.20 | 0.82 | 0.82 | 0.87 | 1.00 | 1.00 | 1.00 |
| 1.00 | 0.50 | 0.45 | 0.15 | 0.11 | 0.62 | 0.58 | 0.54 | 0.96 | 0.96 | 0.96 |
| 1.20 | 0.28 | 0.11 | 0.04 | 0.00 | 0.23 | 0.11 | 0.00 | 0.78 | 0.55 | 0.36 |
| 1.40 | 0.02 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

(Every 0.05 step is in the CSV and in the script output.)

What the sweep says about the defaults:

- **eps 0.6** (streams within eps correlate at least r ≈ 0.82) is the only
  grid value whose mean ARI is ≥ 0.9 in all six settings with noise σ ≤ 0.5
  (0.65 is the only other value that reaches ≥ 0.9 in all six). No single
  eps reaches 0.9 for σ 0.8 across windows: noisy data needs a larger eps
  *and* a longer window.
- Too small an eps makes every stream noise (ARI 0); too large merges
  clusters. The usable range widens with the window length.
- **minPts 2, 3 and 4** give near-identical results here (see the per-minPts
  tables of `summarize.mjs eps`), so minPts stays 2.
- **Raw distances on streams with different levels and scales fail at every
  eps** (ARI ≤ 0.03), which is why z-normalization is on by default.
- With a shared level and scale, raw distances behave like z-normalized ones
  in units of the streams' standard deviation (best eps 0.45–0.75 at σ ≤ 0.5).
  The app therefore derives the raw-mode default from the data: 0.6 × the
  median stream standard deviation in the window.

## `results-e2e.csv` — end-to-end latency in the browser

```sh
yarn build
yarn bench:e2e   # node bench/e2e.mjs --meta bench/results-e2e.meta.json > bench/results-e2e.csv
```

`bench/e2e.mjs` starts `next start` on a free port, opens
`/streamclusters?bench=1` in headless Chromium and, for every configuration
(streams ∈ {50, 200, 500} × layout ∈ {grid, list, treemap, baseline} × row
rate ∈ {1, 10, 50} rows/s), loads a seeded synthetic stream (5 clusters,
nStreams/10 membership switches, 10 anomalies) through
`window.__streamsightBench`, waits 8 s, then collects the app's own samples
for 20 s. The samples are recorded by `src/lib/bench/instrument.ts`; the
same numbers are visible live in the performance overlay (Shift+P or
`?perf=1`, with CSV export).

| column | meaning |
|---|---|
| nStreams, layout, rowsPerSecond | configuration |
| updates | pipeline updates that were painted during the 20 s |
| clusterCountMedian | median clusters per update |
| computeMsP50/P95 | clustering round trip to the Web Worker, including WASM and structured cloning |
| renderMsP50/P95 | from the view-model update until every chart that changed has re-rendered and the next frame was painted |
| latencyMsP50/P95 | from the arrival of the newest row in an update until that frame was painted |

How it is measured: each Vega view registers a render when its data or spec
changes and settles when Vega has finished; after the last one settles the
tracker waits two animation frames (the second runs after the paint).
The pipeline is throttled adaptively (every 500 ms to 5 s, 3× the measured
compute time), so a row can wait up to one throttle interval before an
update includes it; `latencyMs` includes that wait. A newer update that
starts before an older one is painted supersedes it; superseded updates have
no render time and are not counted.

Results: see `bench/results-e2e.csv` (`node bench/summarize.mjs e2e`).

## Limitations

- One machine, one browser, headless. Headless Chromium rasterises canvases
  in software; a GPU-backed desktop browser may render faster.
- The end-to-end runs measure the app as it is at the commit that produced
  the CSV; UI changes after that commit change these numbers.
- The synthetic data has balanced, well-separated clusters. Real data (e.g.
  the NIRS case study) has no ground truth, so ARI is only reported for the
  synthetic data.
- The clusters-over-time view (timeline overview) re-clusters a sliding
  window for every retained row (O(rows · n² · T)); it runs at most every
  10 s and is not benchmarked here. Incremental windows are future work.

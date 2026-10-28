# StreamSight

StreamSight is a browser application for monitoring many parallel time
series ("streams") at once. It groups streams whose recent behaviour is
similar into clusters, draws one chart per cluster instead of one per stream,
and highlights streams that change cluster and values that look anomalous.

It is the prototype described in the StreamClusters / StreamSight paper. This
README describes what the code does today; `docs/revision-notes.md` maps
reviewer comments to changes and lists paper claims the system does not
support.

## Quick start

```sh
yarn install          # yarn classic (1.22, pinned in package.json)
yarn build:wasm       # needs Rust + wasm-pack; builds the clustering module
yarn dev              # http://localhost:3000
```

`yarn build:wasm` must run before `dev`, `build` and the tests: the generated
WASM packages (`backend/rust_wasm_module/pkg`, `pkg-node`) are not committed.
The NIRS case-study data and the raw recordings in `data/` are stored with
Git LFS (`git lfs pull`).

| command | what it does |
|---|---|
| `yarn dev` / `yarn build` / `yarn start` | Next.js 16 (Turbopack); `yarn build:webpack` is a fallback |
| `yarn test` | Vitest unit tests (`src/**/*.test.ts`) |
| `yarn test:rust` | Rust unit tests of the clustering core |
| `yarn lint` | ESLint (flat config from `eslint-config-next`) |
| `yarn bench:compute`, `yarn bench:eps` | clustering cost / quality benchmarks → `bench/results*.csv` |
| `yarn bench:e2e` | end-to-end latency in headless Chromium → `bench/results-e2e.csv` |
| `yarn convert:nirs` | converts the NIRS session into `public/data/` (see below) |

See `bench/README.md` for the benchmark method, hardware and results.

## Pipeline

```
source ──► playback ──► live buffer ──► clustering (Web Worker, WASM) ──► tracking ──► ordering ──► layouts
           (play/pause,   (last 2000      DBSCAN on the current window      stable        stable /     list, grid,
            step, speed)   rows)          (z-normalized RMS distance)       cluster ids   size / ...   tiles, box plots,
                                                                                                        cluster map
```

1. **Source and playback** (`src/store/usePlaybackStore.ts`). A dataset is
   loaded once and replayed row by row at its native sampling rate, ×2, ×10
   or fast-forward ("max"); playback can be paused and stepped (Space, →).
   Playback is a clock: rows that fall due while the browser is busy arrive
   together, so the data rate stays exact.
2. **Clustering** (`backend/rust_wasm_module`, run in
   `src/lib/clustering/clustering.worker.ts`). Every stream in the current
   window (the last `dataTicks` rows, default 50, or a time range selected on
   the timeline) is one point. Two streams' distance is the root-mean-square
   difference over the time points where both have a value; missing values
   are skipped, never filled. By default each stream is first z-normalized
   over the window, so clusters reflect shape, not level or scale, and the
   threshold has a fixed meaning: streams within `eps` correlate at least
   `r = 1 − eps²/2` (default eps 0.6, r ≈ 0.82). Clustering is textbook DBSCAN
   (Ester et al. 1996) with `minPts` (default 2); streams that are neither
   core points nor reachable from one are **outliers** and shown in a grey
   "Outliers" group. Defaults were chosen with the benchmark sweep
   (`bench/README.md`). The whole window is re-clustered on every update;
   there is no incremental clustering.
3. **Settings** come from one builder (`src/lib/clustering/clusteringSettings.ts`)
   used by every clustering call.
4. **Tracking and ordering** (`src/lib/clustering/clusterTracking.ts`,
   `orderClusters.ts`). Clusters are matched to the previous update by member
   overlap, so a cluster keeps its id, colour and position. Streams that
   changed cluster are highlighted for a few updates.
5. **Anomalies** (`src/lib/anomaly/detectAnomalies.ts`). The newest value of
   each stream is compared with its cluster's recent values (median / MAD
   z-score ≥ 3.5); cluster changes are listed as well. Labels are generated
   automatically ("s12: spike +0.42 vs median (z=4.1)").
6. **Updates** run through an adaptive throttle: every 500 ms to 5 s,
   three times the measured clustering time.

## Views

- **Layouts**: list, grid, proportional tiles (tile area = number of member
  streams; a flat tiling, not a hierarchy), baseline box plots (per cluster,
  each member's change since the start of the window; Tukey whiskers), and
  a cluster map (assignment of every stream over time).
- **Charts** per cluster: envelope (min–max of the members), streams that
  recently joined (dashed, in their previous cluster's colour, fading),
  selected streams (black, labelled), anomaly markers (dashed rule and
  triangle). Every time axis shows its unit; all charts share the window's
  time range.
- **Cluster assignment bar**: one cell per stream in its cluster's colour,
  with a stripe in the previous cluster's colour after a change. Hovering a
  cell or a line highlights the stream everywhere; a click pins it;
  right-click assigns it to a cluster manually.
- **Timeline overview**: cluster count over the retained history; brushing
  selects the time range that is clustered; ranges can be bookmarked.
- Colours come from a colour-vision-deficiency-aware palette (8 colours,
  `src/components/clusterColors.ts`, tested under simulated protan, deutan and
  tritan vision); clusters on screen together get different colours.

## Datasets

| dataset | content |
|---|---|
| NIRS (case study) | One de-identified fNIRS session (NIRx Aurora): 210 channels, ΔHbO in µM at 7.63 Hz, 45.7 min, 9 stimulus markers. Converted by `scripts/convert-nirs.mjs` with the modified Beer–Lambert law; this session records no probe geometry, so a nominal path length (L = 3 cm, DPF = 6) is assumed, which scales all channels equally. The converter removes subject, operator, device and date information and refuses to write output that contains them. |
| Synthetic (seeded) | `src/lib/synthetic/generator.ts`: planted clusters, membership switches and injected anomalies at known times; the same seed gives the same data. Used by the benchmarks and for user studies. |
| S&P 500 | 502 daily stock price series, 3,768 trading days (2010–2024), replayed at 1 row/s |
| GDP | 220 yearly GDP series (countries and regions), 1970–2022; not a stream, kept as a small demo |

## User studies and figures

- **Interaction log**: settings and layout changes, hovers (≥ 300 ms),
  pins, manual assignments, anomaly acknowledgements (click an anomaly in the
  list), playback and navigation are logged with timestamps and the data time
  on screen. The log stays on the device (memory and localStorage) and is
  exported as one JSON file per session ("Session" button).
- **Flag event** (button or `F`) logs when the participant noticed something.
  `node scripts/score-session.mjs <session.json>` scores flags against the
  synthetic ground truth (hits, misses, false alarms, time to detect).
- **Study mode** (`?study=1`, off with `?study=0`): analytics (PostHog) is
  never initialised.
- **Reproducible views**: the URL encodes source, seed, playback position,
  all settings and the selected range (`?view=...`); opening it restores the
  view, paused. "PNG" exports the view at 2× resolution; "SVG" exports the
  charts (rendered by Vega's SVG renderer) and the assignment bar as vectors.
- **Performance overlay**: Shift+P or `?perf=1` shows compute, render and
  row-to-paint latency, with CSV export.

## Project layout

```
backend/rust_wasm_module/   Rust clustering core (dbscan.rs) and WASM glue (lib.rs, clustering.rs)
bench/                      benchmark scripts, results and README
scripts/                    NIRS conversion, golden-fixture regeneration, session scoring
src/app/                    Next.js pages (dataset picker, monitoring view)
src/components/             views, charts (Vega-Lite via one VegaChart wrapper), controls
src/lib/                    pure logic: clustering, synthetic data, anomalies, study scoring, time axes
src/store/                  zustand stores (playback, raw buffer, settings, view model, study log)
public/data/                datasets served to the browser
data/                       raw NIRS recordings (Git LFS; contain identifiers, not served)
```

## Tech stack

Next.js 16, React 19, TypeScript 5.9, zustand 5, Vega 6 / Vega-Lite 6
(react-vega 8), d3, Tailwind 4 with Radix UI, Rust → WebAssembly
(wasm-bindgen 0.2.129) in a Web Worker (Comlink), Vitest 5, Playwright.

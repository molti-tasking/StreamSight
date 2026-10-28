# Revision notes: StreamClusters / StreamSight

For the authors preparing the resubmission. Each reviewer comment of the
AVI 2026 and VIS 2025 reviews is listed with:
- what changed in the software (commit, files);
- the evidence (test, CSV or screenshot in this repository);
- the paper sentence that has to change.

Paper locations refer to `../AVI26-streamclusters/content/` and are
approximate (≈ line). Commits are on branch `raw-data`; none are pushed.

Every number here comes from a script in this repository:
- `bench/sweep.mjs` produces `bench/results.csv` and `bench/results-eps.csv`;
- `bench/e2e.mjs` produces `bench/results-e2e.csv`;
- `node bench/summarize.mjs` prints the tables.

The method, hardware and full tables are in `bench/README.md`. No study or
benchmark results have been made up; where something cannot be fixed in code,
the table says so.

## What the system does now (one paragraph for Section 4/5)

Streams are replayed from a recording or a seeded synthetic source. Every
update re-clusters the current window (the last 50 rows by default, or a
range brushed on the timeline) with textbook DBSCAN (Ester et al. 1996,
minPts 2) in Rust/WebAssembly inside a Web Worker. The distance is the RMS
difference between two streams over the time points both have values for,
after per-stream z-normalization. For streams with values at the same time
points this equals √(2(1 − r)), with r their Pearson correlation, so the
default eps 0.6 means r ≥ 0.82. Streams that are neither core points nor
density-reachable from one are shown as "Outliers"; they are not assigned to
the nearest cluster. There is no dimensionality reduction and no incremental
clustering. Clusters keep a stable id (matched by member overlap) and colour
across updates. Updates are throttled adaptively (every 500 ms to 5 s, 3×
the measured compute time).

## Reviewer comments

| # | Reviewer comment | What changed (commit · files) | Evidence | Paper sentence to change |
|---|---|---|---|---|
| 1 | AVI meta: "The most consistent concern across all three reviews is the insufficient justification of design decisions." | Defaults are now justified by data: eps 0.6 and minPts 2 from the eps sweep, z-normalization from raw-vs-normalized results (5f1c2ba · `bench/sweep.mjs`, `src/lib/clustering/epsDefaults.ts`). The rationale for the encodings is still paper work. | `bench/results-eps.csv`; `bench/README.md` "What the sweep says about the defaults" | 05 ≈l.35 (eps "can be adjusted"): state the default, its meaning (r ≥ 0.82) and how it was chosen. |
| 2 | AVI meta: "The visual encodings in StreamSight are described with limited rationale…" | Not a code issue. Encodings are now documented in code and README (box plot whiskers, dashed new members, anomaly shapes). | `README.md` "Views" | Section 5 encodings: add the rationale. |
| 3 | AVI meta: "…merging them into a single, more detailed account that addresses both the design rationale and the system's scalability at computational and perceptual levels." | Computational scalability is measured (5f1c2ba, 23316b1). Perceptual scalability (how many clusters or streams a person can follow) is not measured. | `bench/results.csv`, `bench/results-e2e.csv` | Merged Section 4/5: add the compute and latency results; mark perceptual scalability as not evaluated. |
| 4 | AVI meta: "A single case study participant is regarded as insufficient" | **Cannot be fixed in code.** Study tooling now exists: interaction log, flag events, scoring against ground truth, study mode (0c1df73). | `src/lib/study/scoreFlags.test.ts`; `scripts/score-session.mjs` | 06 ≈l.14: needs more participants (a new study). |
| 5 | AVI meta: "…clearer account of how the system was used, what analytical steps were taken… supported by visual evidence." | Reproducible views (the URL encodes the whole state) and PNG/SVG export support figures (0c1df73). The narrative itself is paper work. | URL round-trip verified in Chromium (row 428 restored); `src/lib/urlState.test.ts` | Section 6 case study: narrate the steps with figures produced from saved URLs. |
| 6 | AVI meta: "…the distinction between automated and manual anomaly detection, and more careful scoping…" | The automated part is now precise and labelled. The median/MAD z-score ≥ 3.5 against the stream's recent values and cluster-change events are auto-labelled in data units (23316b1 · `src/lib/anomaly/detectAnomalies.ts`). Manual: the user flags events (F) and acknowledges listed anomalies (0c1df73). | `src/lib/anomaly/detectAnomalies.test.ts` | 04 ≈l.55 and ≈l.79–80: say exactly what is automated (the rule above) and what is manual. |
| 7 | AVI R1: "some references would have been welcome … (especially 3.2.1 and 3.2.2 [1])" | Not a code issue. | — | Section 3.2: cite Munzner 2014. |
| 8 | AVI R1: "Streamsight visual encodings are described with little detail…" | See #2. | — | Section 5. |
| 9 | AVI R1: "what does "multi-scale" timelines mean in this context?" | What exists: a timeline overview (cluster count over the retained history) whose brush selects the clustered range, plus bookmarks. There is still only one temporal granularity. | `src/components/TimelineOverview.tsx` | 04 and 05 ≈l.56: describe it as "overview + brushed focus range with bookmarks", or drop "multi-scale". |
| 10 | AVI R1: "how the encodings selected match the framework requirements? Were alternatives considered?" | Not a code issue. | — | Section 5. |
| 11 | AVI R1: "I don't really understand what an "envelope chart in a treemap layout" means…" | The treemap is renamed "Proportional tiles" in the UI: a flat tiling sized by member count (23316b1 · `src/lib/settings/StreamClustersSettings.tsx`). Each tile shows the cluster's envelope. | screenshot `docs/screenshots/after-tiles.png` | 05 ≈l.80, 06: "proportional tile layout"; explain envelope = min–max band of the members. |
| 12 | AVI R1: "Some figures showing the expert interactions with the system…" | Interaction logs can now be recorded and exported (0c1df73), but no new sessions were run. | — | Section 6: only with new data. |
| 13 | AVI R1: "In 6.3, I would tone down the claims…" / "they represent anectodal evidence" | Not a code issue. | — | 06 ≈l.54, 08 ≈l.7, 09 ≈l.5 (see "Claims the system does not support"). |
| 14 | AVI R2: "…a lack of details about the study (sessions, number of participants, protocol followed)" | Cannot be fixed in code. | — | Section 3. |
| 15 | AVI R2: "R4: is it not anomaly detection automated by definition?" | See #6. | — | Requirement R4 wording. |
| 16 | AVI R2: "they are not exactly "components" but more functionalities" | Not a code issue. | — | 04 ≈l.4. |
| 17 | AVI R2: "…difficult to evaluate their fit to streaming data and scalability at both computational and perceptual levels." | Computational side measured: compute per window for 10–2000 streams and end-to-end latency in the browser (5f1c2ba, 23316b1). Perceptual side not measured. | `bench/results.csv`, `bench/results-e2e.csv`, `bench/README.md` | Section 4/5: add a scalability subsection. |
| 18 | AVI R2: "…provide more details about the implemented solutions and their capability to scale (e.g., number of events/points, refresh rate, interactivity, etc.) (Revision 3)" | As #17, plus a live performance overlay (Shift+P) with CSV export (23316b1). The refresh rate is adaptive (500 ms–5 s). | e2e table below | 05 ≈l.93 and 06 ≈l.61: "computation throttling (1000ms intervals)" is wrong; the code adapts between 500 ms and 5 s. |
| 19 | AVI R2: "Richer, G., … (2022). Scalability in visualization." / "identify the scalability measures and link design and implementation details (+ tests if available) to them (Revision 4)" | Measures provided: data size (streams 10–2000, window 20–100), update rate (1/10/50 rows/s), compute time, render time and row-to-paint latency, with quality (ARI) alongside. | `bench/results*.csv` | New subsection citing Richer et al. 2022 and mapping these measures to it. |
| 20 | AVI R2: "the section did not discuss the analysis conducted, showing it with figures…" | See #5. | — | Section 6. |
| 21 | AVI R2: "just one expert does not seem to be enough" (Revision 5) | Cannot be fixed in code (see #4). | — | Section 6. |
| 22 | AVI R2: "overclaims demonstration of properties of the system…" | See "Claims the system does not support". | — | 06 ≈l.54, 08 ≈l.7, 09 ≈l.5, 01 ≈l.25. |
| 23 | AVI R2: "The term "visual grammar" is ill-defined here" | Not a code issue. | — | 02 ≈l.70. |
| 24 | AVI R2: "it seems color "clash," … Did the authors look at … color scales that minimize it?" | Yes, now (23316b1 · `src/components/clusterColors.ts`, `src/lib/colorVision.ts`, `src/lib/clustering/colorSlots.ts`):<br>• **Palette:** 8 colours (Okabe–Ito + Tol muted) chosen to maximise the smallest colour difference under simulated protan, deutan and tritan vision. ΔE ≥ 13.5, against 5.7 for the old palette's first 8 colours; the old ids 0 and 1 were red and lime green.<br>• **No sharing:** concurrent clusters never share a colour.<br>• **Not hue alone:** new members are dashed and striped in the bar with their previous cluster's colour.<br>• **Outlier grey:** changed, because the old one matched a palette colour for deuteranopes. | `src/components/clusterColors.test.ts`; `src/lib/clustering/colorSlots.test.ts` | 05 ≈l.40, ≈l.60–61 and Fig. 4 caption ≈l.67: new members are dashed lines in their previous cluster's colour (not "brighter versions"). |
| 25 | AVI R2: "The caption of Figure 5 is quite long" | Not a code issue. | — | Fig. 5 caption. |
| 26 | AVI R2: "…a citation may be needed from Ulmer et al. or Shneidermann" | Not a code issue. | — | 04 ≈l.93. |
| 27 | AVI R3: "…small-scale (one domain case-study participant and two industry experts)…" | Cannot be fixed in code (see #4). | — | Section 6. |
| 28 | AVI R3: "…how sensitive the experience is to ε, what defaults are recommended, and what safeguards exist…" | eps-sensitivity sweep across windows, noise levels and minPts (5f1c2ba). Default 0.6, with the settings dialog showing the equivalent correlation. Safeguards: noise goes to Outliers; z-normalization makes eps dataset-independent; switching mode resets eps to a data-derived default; new members are highlighted for 5 updates. | `bench/results-eps.csv`; table "eps sensitivity" in `bench/README.md` | 05 ≈l.35: add the sensitivity result (usable range 0.55–0.65 for all windows at σ ≤ 0.5; wider for longer windows). |
| 29 | AVI R3: "…clarify what is currently implemented versus what remains future work…" | See "Claims the system does not support". | — | 04 throughout. |
| 30 | VIS R1: "It is not completely clear whether the authors aim for a general method or a dedicated tool for … fNIRS…" | The app now ships the de-identified NIRS session as a dataset, alongside general synthetic and financial data (6ec38c6). | `public/data/nirs-session010.meta.json` | Introduction: state the scope. |
| 31 | VIS R1: "fail to describe and evaluate their specific implementation in sufficient detail" | Implementation documented (README "Pipeline") and evaluated (benchmarks). | `README.md`, `bench/README.md` | Section 5: use the summary paragraph above. |
| 32 | VIS R1: "the multi-scale timeline feature was neither explained in the paper nor in the video." | See #9. | — | 05 ≈l.56. |
| 33 | VIS R1: "The boxplot-based views are either wrongly named … a boxplot corresponds to a specific statistical summary plot and not just an interval…" | It is a real box plot (23316b1 · `src/components/charts/BaselineClusterChart.tsx`, `src/lib/clustering/baseline.ts`). Each cluster shows the quartiles and median of its members' change since the window start; whiskers reach 1.5 × IQR (Tukey), with points beyond. This is documented in the chart subtitle. The old "%" title was wrong (values were raw) and is fixed. | `src/lib/clustering/baseline.test.ts`; screenshots `docs/screenshots/before-baseline.png`, `after-baseline.png` | 05 ≈l.81: "box plots of each member's change since the start of the window (Tukey whiskers)", not "vertical range bars". |
| 34 | VIS R1: claimed but not implemented: "outlier filtering"; "adaptive ordering and prioritization"; "annotation and highlighting"; "automatic labeling of detected events"; "specialized visualizations for cluster transitions"; "progressive disclosure" | Implemented now:<br>• outliers (DBSCAN noise) as a separate group;<br>• ordering by stable id / size / variance / churn (pre-existing);<br>• automatic event labels;<br>• a cluster map over time;<br>• new-member highlighting.<br><br>Not implemented: progressive disclosure, cluster-transition visualizations beyond the cluster map, annotations. | `src/lib/clustering/orderClusters.test.ts`, `detectAnomalies.test.ts` | 04 ≈l.43, ≈l.73–82, ≈l.92–93: keep only what exists (see list below). |
| 35 | VIS R1: Kesavan et al. 2020, Knittel et al. 2021 | Not a code issue (already cited). | — | — |
| 36 | VIS R1: "…a list of typical features provided in existing frameworks with a comparison…" | Not a code issue. | — | Section 2. |
| 37 | VIS R1: "The supplementary video was not that helpful…" | Not a code issue. Saved URLs make a scripted video reproducible. | — | Video. |
| 38 | VIS R1: "The color coding of the time-series in the cluster views did not become clear." | Colours are now stable per cluster, CVD-aware and documented. New members are dashed in their previous cluster's colour; hover/pin draws the stream black and labelled. | see #24 | 05 ≈l.40–41, ≈l.60–61. |
| 39 | VIS R1: "in the beginning all labels where "0.500" and in the tree view the axis started at different times for the left and right halves of the plot." | Both reproduced and fixed (23316b1 · `src/lib/timeAxis.ts`, `src/components/charts/useTimeAxis.ts`, `TreemapLayout.tsx`):<br>• **".500":** sub-second ticks on short windows, plus a startup bug that left the window at 0 rows (fixed in b838345). Axes now have a fixed format with no sub-second ticks.<br>• **Different start times:** tiles were deliberately cut to their width. All charts now share the window's time domain. | `src/lib/timeAxis.test.ts`; `docs/screenshots/before-axis-500.png`, `before-tiles.png`, `after-tiles.png` | — (paper describes intended behaviour) |
| 40 | VIS R1: "Non of the features is examined in detail - not even the performance and latency is evaluated with respect to scalability." | Measured (see #17–19). | `bench/results.csv`, `bench/results-e2e.csv` | Section 6: add the measurements. |
| 41 | VIS R1: "The three example use cases in 7.2 - 7.4 contain not sufficient information…" | Not a code issue. | — | Section 7 (now merged into 6). |
| 42 | VIS R1: "the assignment of clusters to views in the tree view layout seems to be hard to comprehend visually" | Tiles keep their position (keyed by stable id, CSS position transitions) and colour. Hovering a stream links bar and charts. | screenshots | — |
| 43 | VIS R1: "why are the L2 based clustering results "meaningful"?" | The distance is now the RMS over shared time points on z-normalized streams, a monotone function of Pearson correlation. Quality was measured against planted clusters: ARI 1.0 for windows ≥ 50 ticks up to 2000 streams. | `src/lib/clustering/clusteringRecovery.test.ts`; `bench/results.csv` | 05 ≈l.36, 08 ≈l.26: replace "Euclidean distance" with the definition above and its correlation meaning. |
| 44 | VIS R1: "during the instantaneous layout switch tracking the cluster views is hard" | Layout switches animate: each cluster morphs from its old to its new place (View Transitions API, honours "Animate changes" and reduced motion) (23316b1 · `src/lib/viewTransition.ts`). | Tested in Chromium (no errors); not captured as a figure | — |
| 45 | VIS R1 summary: "lacks a comparative analysis…" / "no concrete evidence or user studies" / "…no screenshots or user interviews" | Evidence for the system's properties: benchmarks and tests. User studies: cannot be fixed in code. | as above | Section 6. |
| 46 | VIS R3: "falls short in adequately explaining the actual system and its implementation" | README "Pipeline" and the summary paragraph above. | `README.md` | Section 5. |
| 47 | VIS R3: "standard DBSCAN is used, without specific innovations…" | True, and now actually standard: the shipped default was not DBSCAN. Its "legacy" path compared a neighbour count with eps; this is removed (651630b). The contribution is the system and its evaluation, not the clustering algorithm. | `backend/rust_wasm_module/src/dbscan.rs` tests (`yarn test:rust`) | 05 ≈l.34: keep "DBSCAN", add the distance and normalization. |
| 48 | VIS R3: "…the application of dimensionality reduction is mentioned, but it remains unclear on what data DBSCAN is ultimately applied." | Answer: on each stream's z-normalized values in the current window (no dimensionality reduction). | — | 04 ≈l.39: remove "dimensionality reduction … synopses", or mark as future work. |
| 49 | VIS R3: "…never describes if, and how, this automatic labeling is actually implemented." | It is now: rule-based labels ("s12: spike +0.42 vs median (z=4.1)", "moved from cluster 3") (23316b1 · `detectAnomalies.ts`). | `detectAnomalies.test.ts` | 04 ≈l.79–80: describe the rule. |
| 50 | VIS R3: "candlestick charts…" | Not implemented. | — | Section 2 or Discussion. |
| 51 | VIS R3: "…whether the proposed system can actually handle such high-frequency updates with significant volatility without resulting in visual clutter" | Update rates 1–50 rows/s were measured end to end. Visual clutter was not evaluated. | `bench/results-e2e.csv` | Discussion. |
| 52 | VIS R3: "The evaluation section mainly enumerates potential application areas…" | Cannot be fixed in code. | — | Section 6. |
| 53 | VIS R2: "For economic indicators like GDP, I fail to see the relevance at all…" | GDP is labelled "GDP (non-streaming demo)" and listed separately; the NIRS case study is the default (6ec38c6). | `src/data/streamDataSet.ts` | Remove GDP from the paper's examples. |
| 54 | VIS R2: "…posthoc rationalization of the cluster assignment approach…" | Not a code issue. | — | Section 3/4. |
| 55 | VIS R2: "How many experts are in total?…" / "Which expertise? In which field?" / "How was the thematic analysis … done?" | Cannot be fixed in code. | — | Section 3. |
| 56 | VIS R2: "it is not clear which analysis tasks are actually performed or are relevant" | Not a code issue. The study tooling can record tasks. | — | Section 3/6. |
| 57 | VIS R2: "What are the actual time horizons/update frequencies used for the prototype and in the medical scenario?" | Now concrete:<br>• NIRS sampling: 7.63 Hz, played back at native speed (measured 7.59 rows/s in Chromium).<br>• Clustering window: 50 rows by default (6.6 s for NIRS).<br>• View updates: adaptive, every 500 ms to 5 s.<br>• Session length: 45.7 min. | `src/store/usePlaybackStore.test.ts`; `public/data/nirs-session010.meta.json` | 05/06: state these numbers; 03 ≈l.34 "30 updates per second for 500 channels" is the participants' requirement, not what the prototype was tested at. |
| 58 | VIS R2: "None of the x-axes seem to be labeled with a unit." | Every time axis now has a unit title (see #39). | `docs/screenshots/after-tiles.png` | — |
| 59 | VIS R2: "many of these features are just listed and never demonstrated…" | See "Claims the system does not support". | — | Section 4. |
| 60 | VIS R2: "how is the synopsis generation done? How are distance metrics selected?" | No synopses. There is one distance: RMS over shared points, with z-normalization on by default and switchable. | — | 04 ≈l.39–41. |
| 61 | VIS R2: "Outlier handling is not discussed at all…" / "If outliers are assigned to their nearest cluster, how do they keep their "distinct status"?" | Outliers are DBSCAN noise: not core points and not reachable from one. They are shown in a separate grey "Outliers" group and are **not** assigned to the nearest cluster. minPts is configurable. | `src/lib/clustering/clusteringMinPts.test.ts`, `clusteringRecovery.test.ts` ("outlier streams are labelled noise") | 04 ≈l.43: replace "assigning them to their nearest clusters while maintaining their distinct status". |
| 62 | VIS R2: "Is it still adaptive when using fixed clusters?" | With "Static grouping" (lock) or manual assignments, those streams stay where the user put them; the rest keep being clustered. | — | 04 ≈l.44. |
| 63 | VIS R2: "The prototype just seems to have a global selector for the overall period." / "…coordinated temporal navigations are not discussed." | See #9: overview plus brushed focus range. All cluster charts now share the same time range. | — | 05 ≈l.56. |
| 64 | VIS R2: "What is the hierarchical structure here…? Isn't the current implementation better described as "tile layout"?" | Yes: renamed "Proportional tiles"; no hierarchy (23316b1). | — | 04 ≈l.71 ("nested layouts reflecting hierarchical structure"), 05 ≈l.80. |
| 65 | VIS R2: "The cluster assignment display (Fig 3.) is not well-motivated in the framework." | Not a code issue. It is now linked to the charts (#66). | — | Section 4/5. |
| 66 | VIS R2: "Visually linking the time series in the assignment chart and line plots seems cumbersome…" | Linked in both directions, with click-to-pin (23316b1 · `src/store/useStreamSelectionStore.ts`, `ClusterLegend.tsx`, `VegaLiteHighlightedChart.tsx`). Hovering a cell or a line highlights the stream in both; a click pins it; right-click assigns it manually. | Chromium check: hovering a chart outlines 1 bar cell, a click keeps it pinned; screenshot `docs/screenshots/after-pinned.png` | 05: describe the linking. |
| 67 | VIS R2: "I don't see any implementation of "Annotation & Highlighting" beyond the baseline…" | Highlighting: new members, hovered/pinned streams, anomaly markers in every layout (23316b1). Annotation (user notes) is not implemented; bookmarks of time ranges exist. | screenshots | 04 "Annotation": drop or mark as future work. |
| 68 | VIS R2: "Which technical challenges were solved for the dynamic processing? Which libraries were used? …Kafka etc." | Documented in README "Tech stack" / "Pipeline":<br>• WASM clustering in a Web Worker;<br>• a second worker for the over-time series;<br>• Vega views updated in place instead of rebuilt;<br>• adaptive throttle.<br><br>No comparison with Kafka. | `README.md`; `bench/results-e2e-pre-ui-revision.csv` vs `results-e2e.csv` | 05 ≈l.90–94: no "WASM/Rust" mention today, add it; "Canvas-based rendering" is correct (now set explicitly). |
| 69 | VIS R2: "Which dataset was used? How many clusters were visible? Which tasks…? …success metrics?" | Dataset now in the repo (de-identified). Success metrics can be computed for synthetic sessions (time-to-detect, hit rate). Tasks: not a code issue. | `scripts/score-session.mjs` | Section 6. |
| 70 | VIS R2: "Overall, the qualitative feedback of the experts is pretty high-level" / "…selection of data and human challenges a bit arbitrary" / Fig. 1 caption grammar / video | Not code issues. | — | — |

## Claims the system does not support

Each must be removed, rephrased or marked as future work:

1. **Dimensionality reduction / "compact synopses"** before clustering (04 ≈l.39). DBSCAN runs on the windowed, z-normalized values.
2. **"Incremental clustering"** (04 ≈l.41). Every update re-clusters the whole window. (Only the clusters-over-time series reuses earlier windows' results.)
3. **"Configurable distance metrics"** (04 ≈l.41) and "other distance functions can be implemented" (05 ≈l.36). There is one distance; only normalization on/off is configurable.
4. **"Euclidean distance"** (05 ≈l.36, 08 ≈l.26). It is the RMS difference over shared time points, after z-normalization by default.
5. **Outliers "assigned to their nearest clusters while maintaining their distinct status"** (04 ≈l.43). They form a separate Outliers group.
6. **Horizon charts, sparklines, heatmaps, difference plots** (04 ≈l.63–65). Not implemented.
7. **"Nested layouts reflecting hierarchical structure"**, **"similarity-based positioning"** (04 ≈l.71–74). Not implemented; the tile layout is flat.
8. **"Summary visualizations of cluster stability"**, **"configurable visual alerts"**, **"progressive disclosure"**, **annotations** (04 ≈l.82–93). Not implemented. The closest are the timeline overview (cluster count over time), the cluster map and the anomaly list.
9. **"Temporal bookmarking"** (04 ≈l.58). This exists: brushed ranges can be bookmarked.
10. **Selectable baseline timestamp with a grey overlay** (05 ≈l.86). Not implemented; the baseline is the start of the window.
11. **"Vertical range bars"** (05 ≈l.81). These are box plots (see #33).
12. **"Brighter versions that gradually fade"** (05 ≈l.60–61). New members are dashed lines in their previous cluster's colour, fading over the history depth. The Fig. 4 caption (≈l.67) and the text currently contradict each other.
13. **"Adaptive throttling adjusts computation frequency based on data volume"** (05 ≈l.93) and **"computation throttling (1000ms intervals)"** (06 ≈l.61). It adapts to measured compute time (3×, between 500 ms and 5 s), not to data volume, and is not a fixed 1000 ms.
14. **"Real (anonymized) blood oxygenation data"** (06 ≈l.17). The shipped data is ΔHbO computed with a nominal path length (no probe geometry was recorded). The absolute µM values depend on that assumption; the shapes do not.
15. **Effectiveness claims**: "confirms effectiveness for managing high-frequency, multi-stream data" (06 ≈l.54); "demonstrated how clustering effectively reduces visual complexity" (08 ≈l.7); "experts could identify complex patterns … previously inaccessible" (09 ≈l.5); "identify subtle patterns obscured in traditional monitoring tools" (01 ≈l.25). These rest on one participant and two short expert sessions. The benchmarks show computational properties only.
16. **Fig. 1 description** (`streamclusters.tex` ≈l.212: "80 streams", "monitoring period set to 1 hour", "30-second time window", toolbar sections). It no longer matches the UI. Regenerate it from a saved URL.
17. **Scale in the participant quote** (03 ≈l.34: 500 channels at 30 updates/s = 15,000 values/s). The prototype was measured up to 500 streams at 50 rows/s end to end and 2000 streams per clustering in Node. At 500 streams, the line-chart layouts take 0.14–0.45 s (p50) to re-render per update (see below).

## Benchmark results to report

From `bench/README.md` (Apple M3 Pro, Node 22.23, Chromium 145 headless):

- **Clustering quality** (planted clusters, noise σ 0.3, defaults): ARI 1.0 for windows of 50 and 100 ticks at 10–2000 streams. With 20-tick windows at ≥ 500 streams ARI is 0.87–0.93: short windows let unrelated streams correlate by chance.
- **Compute per clustering** (WASM call, p95): < 18 ms up to 200 streams × 100 ticks; 105 ms at 1000 × 100; 294 ms at 2000 × 100. For small inputs most of the time is (de)serializing rows, not DBSCAN.
- **eps sensitivity**: see the table in `bench/README.md`.
- **End-to-end latency**: see "End-to-end results" below.

## End-to-end results

From `bench/results-e2e.csv` (final code; `node bench/summarize.mjs e2e`;
headless Chromium 145, 1440×900, 20 s per configuration after 8 s warm-up,
5 planted clusters). p50 values, ms:

| streams | layout | render (1 / 10 / 50 rows/s) | row → paint latency (1 / 10 / 50 rows/s) | compute p95, worst rate |
|---|---|---|---|---|
| 50 | grid | 29 / 44 / 29 | 45 / 116 / 46 | 15 |
| 50 | list | 29 / 44 / 42 | 41 / 112 / 61 | 16 |
| 50 | proportional tiles | 28 / 45 / 32 | 64 / 112 / 47 | 22 |
| 50 | box plots | 17 / 13 / 14 | 31 / 70 / 34 | 17 |
| 200 | grid | 64 / 131 / 120 | 92 / 199 / 163 | 39 |
| 200 | list | 68 / 126 / 119 | 104 / 209 / 163 | 39 |
| 200 | proportional tiles | 64 / 135 / 134 | 129 / 235 / 179 | 100 |
| 200 | box plots | 17 / 13 / 15 | 45 / 86 / 56 | 37 |
| 500 | grid | 138 / 288 / 215 | 205 / 417 / 298 | 89 |
| 500 | list | 161 / 296 / 307 | 231 / 421 / 403 | 89 |
| 500 | proportional tiles | 137 / 311 / 451 | 275 / 406 / 673 | 283 |
| 500 | box plots | 21 / 28 / 29 | 84 / 155 / 118 | 109 |

Reading:
- Up to 200 streams, a new row is on screen within about 0.1–0.24 s
  (p50) in every layout.
- At 500 streams, the line-chart layouts need 0.14–0.45 s to re-render
  (p50; p95 up to 0.72 s). Rendering, not clustering, is the bottleneck
  there (compute p95 ≤ 0.29 s); the box-plot view stays below 0.03 s.
- Latency includes waiting for the next throttled update (≥ 500 ms
  apart), which is why 10 rows/s often shows higher latency than 50 rows/s.
- Before the worker-contention fix and the in-place chart updates
  (`bench/results-e2e-pre-ui-revision.csv`, same machine), compute p95
  reached 19.3 s at 500 streams and some configurations painted only 2–7
  updates in 20 s; now every configuration paints 19–40.

## Decisions and deviations from the task list

- **Commits for items 14–25.** These share files (the charts, the view model, the page), so they were committed per phase: 23316b1 for items 14–22 and 0c1df73 for 23–25, not one commit per item. The commit messages itemise what each item changed.
- **Planned NIRS geometry not available.** The decision was ΔHbO via MBLL with geometry from the `.snirf`. Neither the `.snirf` nor the `.nirs` contain probe positions (`montage_path` is empty), so a nominal L = 3 cm and DPF = 6 are used and recorded in `public/data/nirs-session010.meta.json`.
- **Sampling rate source.** The rate comes from `_config.hdr`, because the config JSON has no rate field; it is cross-checked against the SNIRF time vector.
- **Pinned tool versions.**
  - ESLint stays on 9: `eslint-plugin-react`, `-import` and `-jsx-a11y` do not declare ESLint 10 support.
  - TypeScript stays on 5.9: typescript-eslint supports < 6.1.
  - Playwright is pinned to 1.58.2 to use the locally cached Chromium.
- **Yarn classic pinned.** The `packageManager` field pins Yarn 1.22.22; without it corepack picked Yarn 4, which rejects the v1 lockfile.
- **Bugs found and fixed along the way:**
  - The default chart grew memory without bound (≈ 4 GB within 30 s) with ~200 streams (e9a4c6e).
  - The app started with an empty clustering window (b838345).
  - Anomaly markers never rendered (23316b1).
  - Cluster id 0 was treated as "no previous cluster" (23316b1).
  - Worker contention gave computeMs p95 of 4–19 s (23316b1).

## Not done / open

- **Raw recordings in git history.**
  - `data/2022-05-25/**/*.wl1`/`.wl2` (≈ 318 MB) were committed before their LFS rule existed and are pushed to `origin/raw-data`.
  - The raw session files there contain a subject code, an operator user name and device serials.
  - Fixing this needs a history rewrite and a force push, which is your decision.
- **Orphaned files that nothing imports**: `DataSettingsPopover.tsx`, `VisualizationSettingsForm.tsx`, `VisualizationSettingsDialog.tsx`, `VisualizationPreferencesPopover.tsx`, `RawDataContext.tsx`, `MultiLineChart.tsx`, `AggregatedLineChart.tsx`, `MultiAggregatedLineChart.tsx`, `charts/BaselineChart.tsx`. They were not deleted, because only the AI-experiment deletion was approved.
- **Not implemented:** progressive disclosure, annotations and baseline-timestamp selection (see the claims list).
- **Not measured:** perceptual scalability and visual clutter.

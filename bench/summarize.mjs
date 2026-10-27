// Summaries of the benchmark CSVs, printed as Markdown tables.
//
//   node bench/summarize.mjs eps   [bench/results-eps.csv]
//   node bench/summarize.mjs scale [bench/results.csv]
//   node bench/summarize.mjs e2e   [bench/results-e2e.csv]
//
// eps:   mean ARI over seeds for each eps, per distance mode / window / noise
//        (minPts 2), and the eps that maximises mean ARI for each setting.
// scale: mean over seeds of ARI, cluster count and compute time per size.
// e2e:   the end-to-end latency rows as a table.
import { readFileSync } from "node:fs";

const [kind = "eps", file] = process.argv.slice(2);
const defaults = { eps: "bench/results-eps.csv", scale: "bench/results.csv", e2e: "bench/results-e2e.csv" };
const text = readFileSync(file ?? defaults[kind], "utf8").trim().split("\n");
const header = text[0].split(",");
const rows = text.slice(1).map((line) => {
  const cells = line.split(",");
  return Object.fromEntries(header.map((h, i) => [h, isNaN(Number(cells[i])) || cells[i] === "" ? cells[i] : Number(cells[i])]));
});

const groupBy = (items, key) => {
  const map = new Map();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (v, d = 3) => (typeof v === "number" ? v.toFixed(d) : v);
const table = (cols, data) =>
  [`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`, ...data.map((r) => `| ${r.join(" | ")} |`)].join("\n");

if (kind === "eps") {
  const mode = (r) => (r.zNormalize === "true" || r.zNormalize === true ? "z-normalized" : `raw (${r.transform === "none" ? "same scale" : "mixed scale"})`);
  for (const minPts of [...new Set(rows.map((r) => r.minPts))]) {
    const selected = rows.filter((r) => r.minPts === minPts);
    console.log(`\n### Best eps per setting (minPts ${minPts}, mean ARI over seeds)\n`);
    const best = [];
    for (const [key, group] of groupBy(selected, (r) => `${mode(r)}|${r.windowTicks}|${r.noiseSigma}`)) {
      const byEps = [...groupBy(group, (r) => r.eps)].map(([eps, g]) => ({ eps, ari: mean(g.map((r) => r.ari)), clusters: mean(g.map((r) => r.clusterCount)) }));
      const top = byEps.reduce((a, b) => (b.ari > a.ari ? b : a));
      const good = byEps.filter((e) => e.ari >= 0.9).map((e) => e.eps);
      const [m, w, s] = key.split("|");
      best.push([m, w, s, fmt(top.eps, 2), fmt(top.ari), fmt(top.clusters, 1), good.length ? `${Math.min(...good)}–${Math.max(...good)}` : "none"]);
    }
    console.log(table(["mode", "window", "noise σ", "best eps", "mean ARI", "clusters", "eps with ARI ≥ 0.9"], best));
  }
  console.log("\n### eps sensitivity, z-normalized, minPts 2 (mean ARI over seeds; columns = noise σ / window)\n");
  const z = rows.filter((r) => (r.zNormalize === "true" || r.zNormalize === true) && r.minPts === 2);
  const settings = [...groupBy(z, (r) => `${r.noiseSigma}/${r.windowTicks}`).keys()];
  const lines = [...groupBy(z, (r) => r.eps)].map(([eps, g]) => [
    fmt(eps, 2),
    fmt(1 - (eps * eps) / 2, 2),
    ...settings.map((s) => fmt(mean(g.filter((r) => `${r.noiseSigma}/${r.windowTicks}` === s).map((r) => r.ari)), 2)),
  ]);
  console.log(table(["eps", "r ≥", ...settings.map((s) => `σ ${s.replace("/", ", w ")}`)], lines));
} else if (kind === "scale") {
  const lines = [...groupBy(rows, (r) => `${r.nStreams}|${r.windowTicks}`)].map(([key, g]) => {
    const [n, w] = key.split("|");
    return [n, w, fmt(mean(g.map((r) => r.ari))), fmt(mean(g.map((r) => r.clusterCount)), 1), fmt(mean(g.map((r) => r.computeMsP50)), 2), fmt(mean(g.map((r) => r.computeMsP95)), 2), fmt(mean(g.map((r) => r.coreMsP50)), 2)];
  });
  console.log(table(["streams", "window", "mean ARI", "clusters", "compute p50 (ms)", "compute p95 (ms)", "DBSCAN core p50 (ms)"], lines));
} else {
  console.log(table(header, rows.map((r) => header.map((h) => fmt(r[h], 1)))));
}

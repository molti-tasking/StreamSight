// End-to-end latency benchmark of the live app in headless Chromium.
//
//   yarn build && node bench/e2e.mjs > bench/results-e2e.csv
//
// Starts `next start` on a free port, opens /streamclusters?bench=1, and for
// every configuration (streams x layout x row rate) loads a seeded synthetic
// stream through window.__streamsightBench, lets it warm up, then collects
// the app's own per-update samples (src/lib/bench/instrument.ts):
//   computeMs  clustering round trip to the worker (incl. WASM)
//   renderMs   view-model update -> all changed charts re-rendered -> painted
//   latencyMs  arrival of the newest row in the update -> painted
// The adaptive throttle runs the pipeline at most every 500 ms, so a row
// waits up to that long before an update picks it up; latencyMs includes it.
//
// Options: --streams 50,200,500 --layouts grid,list,treemap,baseline
//          --rates 1,10,50 --warmup 8 --measure 20 --meta <path>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import { createServer } from "node:net";
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const list = (name, fallback) => String(arg(name, fallback)).split(",");

const streams = list("streams", "50,200,500").map(Number);
const layouts = list("layouts", "grid,list,treemap,baseline");
const rates = list("rates", "1,10,50").map(Number);
const warmupSec = Number(arg("warmup", 8));
const measureSec = Number(arg("measure", 20));
const metaPath = arg("meta", undefined);
const viewport = { width: 1440, height: 900 };

const freePort = () =>
  new Promise((resolve) => {
    const server = createServer().listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const percentile = (values, q) => {
  if (!values.length) return "";
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))].toFixed(1);
};

const port = await freePort();
// Own process group, so the whole server (not just a wrapper) is stopped.
const server = spawn("node_modules/.bin/next", ["start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "inherit"],
  detached: true,
});
const stopServer = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // already gone
  }
};
process.on("exit", stopServer);
await new Promise((resolve, reject) => {
  server.stdout.on("data", (chunk) => /Ready|started server|Local:/.test(String(chunk)) && resolve());
  server.on("exit", (code) => reject(new Error(`next start exited with ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// Not "networkidle": analytics (if configured) keeps the network busy.
await page.goto(`http://localhost:${port}/streamclusters?bench=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__streamsightBench, null, { timeout: 60000 });

const columns = [
  "nStreams", "layout", "rowsPerSecond", "updates", "clusterCountMedian",
  "computeMsP50", "computeMsP95", "renderMsP50", "renderMsP95", "latencyMsP50", "latencyMsP95",
];
const rows = [];
for (const nStreams of streams) {
  for (const layout of layouts) {
    for (const rowsPerSecond of rates) {
      await page.evaluate(
        (config) => window.__streamsightBench.configure(config),
        { nStreams, layout, rowsPerSecond, durationSec: warmupSec + measureSec + 30 }
      );
      await page.waitForTimeout(warmupSec * 1000);
      await page.evaluate(() => window.__streamsightBench.clear());
      await page.waitForTimeout(measureSec * 1000);
      const samples = (await page.evaluate(() => window.__streamsightBench.getSamples())).filter(
        (s) => s.renderMs !== undefined
      );
      const pick = (key) => samples.map((s) => s[key]);
      rows.push({
        nStreams,
        layout,
        rowsPerSecond,
        updates: samples.length,
        clusterCountMedian: percentile(pick("clusterCount"), 0.5),
        computeMsP50: percentile(pick("computeMs"), 0.5),
        computeMsP95: percentile(pick("computeMs"), 0.95),
        renderMsP50: percentile(pick("renderMs"), 0.5),
        renderMsP95: percentile(pick("renderMs"), 0.95),
        latencyMsP50: percentile(pick("latencyMs"), 0.5),
        latencyMsP95: percentile(pick("latencyMs"), 0.95),
      });
      process.stderr.write(`e2e n=${nStreams} ${layout} ${rowsPerSecond} rows/s: ${samples.length} updates\n`);
    }
  }
}

process.stdout.write([columns.join(","), ...rows.map((r) => columns.map((c) => r[c]).join(","))].join("\n") + "\n");

if (metaPath) {
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        command: `node bench/e2e.mjs ${argv.join(" ")}`,
        generatedAt: new Date().toISOString(),
        browser: `${chromium.name()} ${browser.version()} (headless, Playwright)`,
        viewport,
        deviceScaleFactor: 1,
        warmupSec,
        measureSec,
        node: process.version,
        platform: `${os.platform()} ${os.release()} ${os.arch()}`,
        cpu: os.cpus()[0]?.model,
        memoryGB: Number((os.totalmem() / 2 ** 30).toFixed(1)),
        pageErrors: errors,
      },
      null,
      2
    ) + "\n"
  );
}

await browser.close();
stopServer();
process.exit(0);

// Converts one NIRx Aurora fNIRS session into a StreamSight dataset.
//
//   yarn convert:nirs [--session data/2022-05-25/2022-05-25_010] [--name session010]
//
// Input (git LFS, see README): <session>.snirf (raw light intensities, time
// vector, stimulus markers) and <session>_config.hdr (sampling rate).
// Output (public/data/):
//   nirs-<name>-hbo.json.gz  rows {timestamp: ms since recording start, "S1-D1": ΔHbO µM, ...}
//   nirs-<name>.meta.json    units, sampling rate, conversion constants, events
//
// Privacy: the session metadata contains a subject code, an operator's user
// name, the device serial and recording dates. None of it is copied: rows
// carry only channel names, relative time and values. Before anything is
// written, the output is scanned for those identifiers and the script aborts
// if one is found.
//
// Signal: oxygenated-haemoglobin change (ΔHbO) by the modified Beer-Lambert
// law, ΔOD_λ(t) = -log10(I_λ(t) / Ī_λ) = (ε_HbO,λ ΔHbO + ε_HbR,λ ΔHbR) · L · DPF,
// solved for the two wavelengths. Ī_λ is the channel's mean intensity over
// the first BASELINE_S seconds (what a monitor could compute at start-up).
// This session records no probe geometry (SNIRF probe has wavelengths only;
// the .nirs SD.SrcPos/DetPos are empty), so L is a nominal constant. The
// absolute ΔHbO scale therefore depends on L and DPF; shapes do not, and
// z-normalized clustering is unaffected by a common scale factor.
import h5wasm from "h5wasm/node";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { basename, join } from "node:path";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const sessionDir = arg("session", "data/2022-05-25/2022-05-25_010");
const name = arg("name", "session010");
const outDir = arg("out", "public/data");
const session = basename(sessionDir);

// Molar extinction coefficients of haemoglobin, cm^-1/M, decadic (Prahl,
// https://omlc.org/spectra/hemoglobin/summary.html).
const EXTINCTION = {
  760: { hbo: 586, hbr: 1548.52 },
  850: { hbo: 1058, hbr: 691.32 },
};
const PATH_LENGTH_CM = 3.0; // nominal source-detector distance (no geometry recorded)
const DPF = 6.0; // differential pathlength factor, both wavelengths
const BASELINE_S = 60;
const SIGNIFICANT_DIGITS = 4;
// Identifiers that must never appear in the output (see "Privacy" above):
// subject code, operator user name, animal/montage tag, device serial, PDF
// author/e-mail, and any calendar date or clock time.
const FORBIDDEN = [/YCOR/i, /nradu/i, /Pig\d/i, /2043_0217/, /Abdul|GZimeo/i, /@/, /\b(19|20)\d\d-\d\d-\d\d/, /\b\d\d:\d\d:\d\d\b/];

// --- inputs ---------------------------------------------------------------
const hdr = readFileSync(join(sessionDir, `${session}_config.hdr`), "latin1");
const rateMatch = hdr.match(/^Sampling rate=([\d.]+)/m);
if (!rateMatch) throw new Error("No 'Sampling rate=' in the .hdr file");
const samplingRateHz = Number(rateMatch[1]);

await h5wasm.ready;
const file = new h5wasm.File(join(sessionDir, `${session}.snirf`), "r");
const toNum = (v) => (typeof v === "bigint" ? Number(v) : v);
const scalar = (path) => toNum(Array.from(file.get(path).value)[0]);

const wavelengths = Array.from(file.get("nirs/probe/wavelengths").value);
const time = Array.from(file.get("nirs/data1/time").value);
const [nSamples, nMeasurements] = file.get("nirs/data1/dataTimeSeries").shape;
const raw = file.get("nirs/data1/dataTimeSeries").value; // row-major, samples x measurements

const dt = time[1] - time[0];
if (Math.abs(dt * samplingRateHz - 1) > 1e-6) {
  throw new Error(`SNIRF time step ${dt}s does not match the .hdr rate ${samplingRateHz}Hz`);
}

// measurementListN: which source/detector/wavelength each column holds.
const measurements = Array.from({ length: nMeasurements }, (_, i) => {
  const base = `nirs/data1/measurementList${i + 1}`;
  return {
    column: i,
    channel: `S${scalar(`${base}/sourceIndex`)}-D${scalar(`${base}/detectorIndex`)}`,
    wavelength: wavelengths[scalar(`${base}/wavelengthIndex`) - 1],
  };
});

const events = [];
for (const key of file.get("nirs").keys().filter((k) => /^stim\d+$/.test(k))) {
  const code = Array.from(file.get(`nirs/${key}/name`).value)[0];
  const data = Array.from(file.get(`nirs/${key}/data`).value);
  for (let i = 0; i < data.length; i += 3) {
    events.push({ code: String(code), onsetMs: Math.round(data[i] * 1000), durationMs: Math.round(data[i + 1] * 1000) });
  }
}
events.sort((a, b) => a.onsetMs - b.onsetMs);
file.close();

// --- modified Beer-Lambert law --------------------------------------------
const [lo, hi] = wavelengths;
if (!EXTINCTION[lo] || !EXTINCTION[hi]) throw new Error(`No extinction coefficients for ${wavelengths}`);
// Solve [ΔOD_lo; ΔOD_hi] = L·DPF · [[e_hbo_lo, e_hbr_lo]; [e_hbo_hi, e_hbr_hi]] · [ΔHbO; ΔHbR]
const a = EXTINCTION[lo].hbo, b = EXTINCTION[lo].hbr, c = EXTINCTION[hi].hbo, d = EXTINCTION[hi].hbr;
const det = a * d - b * c;
const toMicroMolar = 1e6 / (PATH_LENGTH_CM * DPF);
const hboFromOd = (odLo, odHi) => ((d * odLo - b * odHi) / det) * toMicroMolar;

const byChannel = new Map();
for (const m of measurements) {
  if (!byChannel.has(m.channel)) byChannel.set(m.channel, {});
  byChannel.get(m.channel)[m.wavelength] = m.column;
}
const channels = [...byChannel.keys()].filter((ch) => byChannel.get(ch)[lo] !== undefined && byChannel.get(ch)[hi] !== undefined);
const baselineSamples = Math.min(nSamples, Math.round(BASELINE_S * samplingRateHz));

const intensity = (s, column) => raw[s * nMeasurements + column];
const baselineMean = (column) => {
  let sum = 0, n = 0;
  for (let s = 0; s < baselineSamples; s++) {
    const v = intensity(s, column);
    if (Number.isFinite(v) && v > 0) { sum += v; n++; }
  }
  return n > 0 ? sum / n : NaN;
};
const baselines = channels.map((ch) => ({ lo: baselineMean(byChannel.get(ch)[lo]), hi: baselineMean(byChannel.get(ch)[hi]) }));
const isUsable = channels.map((_, i) => Number.isFinite(baselines[i].lo) && Number.isFinite(baselines[i].hi));
const usable = channels.filter((_, i) => isUsable[i]);
const columns = channels.map((ch) => byChannel.get(ch));

const round = (v) => Number(v.toPrecision(SIGNIFICANT_DIGITS));
const rows = [];
let missing = 0;
for (let s = 0; s < nSamples; s++) {
  const row = { timestamp: Math.round(time[s] * 1e6) / 1e3 };
  channels.forEach((ch, i) => {
    if (!isUsable[i]) return;
    const iLo = intensity(s, columns[i][lo]);
    const iHi = intensity(s, columns[i][hi]);
    if (!(iLo > 0) || !(iHi > 0)) { missing++; return; } // log undefined: leave missing
    const value = hboFromOd(-Math.log10(iLo / baselines[i].lo), -Math.log10(iHi / baselines[i].hi));
    if (Number.isFinite(value)) row[ch] = round(value); else missing++;
  });
  rows.push(row);
}

const meta = {
  name: `NIRS ${name} (ΔHbO)`,
  description:
    "fNIRS recording (NIRx Aurora, 210 source-detector channels), oxygenated-haemoglobin change per channel relative to the first " +
    `${BASELINE_S} s. Identifiers removed; time is relative to the recording start.`,
  unit: "µM (ΔHbO, assuming L·DPF below)",
  samplingRateHz,
  intervalMs: 1000 / samplingRateHz,
  samples: nSamples,
  channels: usable.length,
  missingValues: missing,
  conversion: {
    method: "modified Beer-Lambert law",
    wavelengthsNm: wavelengths,
    extinctionCoefficients: { unit: "cm^-1/M (decadic)", source: "Prahl, omlc.org/spectra/hemoglobin/summary.html", values: EXTINCTION },
    pathLengthCm: PATH_LENGTH_CM,
    pathLengthNote: "nominal; this session records no probe geometry",
    dpf: DPF,
    baselineSeconds: BASELINE_S,
    significantDigits: SIGNIFICANT_DIGITS,
  },
  events,
};

// --- privacy guard, then write --------------------------------------------
const dataJson = JSON.stringify(rows);
const metaJson = JSON.stringify(meta, null, 2);
for (const [label, text] of [["data", dataJson], ["meta", metaJson]]) {
  const hit = FORBIDDEN.find((pattern) => pattern.test(text));
  if (hit) throw new Error(`Refusing to write: ${label} output matches identifier pattern ${hit}`);
}

mkdirSync(outDir, { recursive: true });
const dataPath = join(outDir, `nirs-${name}-hbo.json.gz`);
const metaPath = join(outDir, `nirs-${name}.meta.json`);
writeFileSync(dataPath, gzipSync(dataJson, { level: 9 }));
writeFileSync(metaPath, metaJson + "\n");
console.log(
  `${session}: ${nSamples} samples x ${usable.length} channels at ${samplingRateHz} Hz, ` +
    `${events.length} events, ${missing} missing values`
);
console.log(`wrote ${dataPath} (${(dataJson.length / 1e6).toFixed(1)} MB JSON, gzipped) and ${metaPath}`);

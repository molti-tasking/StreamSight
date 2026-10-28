// Scores a user-study session exported from the app ("Session" button):
// time-to-detect and hit / miss / false-alarm counts of the participant's
// "Flag event" presses against the synthetic stream's ground truth.
//
//   node scripts/score-session.mjs <session.json> [--tolerance 10000] [--events anomalies,switches]
//
// The ground truth is regenerated from the source config recorded in the
// session (seed, streams, clusters, ...), so it is exactly the data the
// participant saw. Times are data times (ms on the stream's clock).
import { readFileSync } from "node:fs";
import { generateSynthetic } from "../src/lib/synthetic/generator.ts";
import { scoreFlags } from "../src/lib/study/scoreFlags.ts";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
if (!file) {
  console.error("usage: node scripts/score-session.mjs <session.json> [--tolerance ms] [--events anomalies,switches]");
  process.exit(1);
}

const session = JSON.parse(readFileSync(file, "utf8"));
if (session.source?.kind !== "synthetic") {
  console.error("The session's source is not a synthetic stream; there is no ground truth to score against.");
  process.exit(1);
}
const toleranceMs = Number(arg("tolerance", 10000));
const kinds = String(arg("events", "anomalies,switches")).split(",");

const { truth } = generateSynthetic(session.source.config);
const events = [
  ...(kinds.includes("anomalies") ? truth.anomalies.map((a) => ({ atTime: a.atTime, kind: a.kind, stream: a.stream })) : []),
  ...(kinds.includes("switches") ? truth.switches.map((s) => ({ atTime: s.atTime, kind: "switch", stream: s.stream })) : []),
];

// Only events the participant could have seen: up to the last row shown.
const lastDataTime = Math.max(...session.events.map((e) => e.detail?.dataTime ?? -Infinity));
const seen = events.filter((e) => e.atTime <= lastDataTime);
const flags = session.events
  .filter((e) => e.type === "flag" && Number.isFinite(e.detail?.dataTime))
  .map((e) => ({ dataTime: e.detail.dataTime }));

const score = scoreFlags(seen, flags, toleranceMs);
console.log(
  JSON.stringify(
    {
      session: session.sessionId,
      source: session.source.config,
      toleranceMs,
      eventKinds: kinds,
      eventsShown: seen.length,
      eventsTotal: events.length,
      flags: flags.length,
      ...score,
    },
    null,
    2
  )
);

import { describe, expect, test } from "vitest";
import { generateSynthetic } from "../synthetic/generator";
import { adjustedRandIndex } from "../synthetic/ari";
import { aggregate } from "./wasmNode";
import { DEFAULT_EPS_Z_NORMALIZED } from "./epsDefaults";

// Planted-cluster recovery with the default settings (z-normalized RMS
// distance, eps 0.6, minPts 2).
//
// Documented noise level: 100 streams in 4 planted clusters over a 100-tick
// window, white noise with sigma 0.3 relative to the unit-variance prototype
// (members correlate about 1 / (1 + 0.3^2) = 0.92, i.e. distance ~0.41).
const SETTINGS = { eps: DEFAULT_EPS_Z_NORMALIZED, minPts: 2, zNormalize: true };

function recoveryAri(seed: number, noiseSigma: number, nTicks = 100) {
  const ds = generateSynthetic({ seed, nStreams: 100, nTicks, nClusters: 4, noiseSigma });
  const result = aggregate(ds.rows, ds.dimensions, { ...SETTINGS, dataTicks: nTicks });
  const predicted = result.clusterAssignment.map(([, cluster]) => cluster);
  return adjustedRandIndex(ds.truth.labels, predicted);
}

describe("planted clusters (100 streams, k=4, 100 ticks, noise sigma 0.3)", () => {
  test.each([1, 2, 3, 4, 5])("seed %i is recovered with ARI >= 0.9", (seed) => {
    expect(recoveryAri(seed, 0.3)).toBeGreaterThanOrEqual(0.9);
  });

  test("negative control: at noise sigma 2 the clusters are not recovered", () => {
    expect(recoveryAri(1, 2.0)).toBeLessThan(0.9);
  });
});

test("outlier streams are labelled noise", () => {
  const ds = generateSynthetic({
    seed: 11,
    nStreams: 40,
    nTicks: 100,
    nClusters: 2,
    outlierStreams: 4,
  });
  const result = aggregate(ds.rows, ds.dimensions, { ...SETTINGS, dataTicks: 100 });
  const predicted = new Map(result.clusterAssignment);
  ds.dimensions.forEach((dim, i) => {
    if (ds.truth.labels[i] === -1) expect(predicted.get(dim)).toBe(-1);
  });
  expect(
    adjustedRandIndex(ds.truth.labels, result.clusterAssignment.map(([, c]) => c))
  ).toBeGreaterThanOrEqual(0.9);
});

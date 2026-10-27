import { expect, test } from "vitest";
import { generateSynthetic, mulberry32 } from "../synthetic/generator";
import { aggregate } from "./wasmNode";

// With z-normalization, clustering depends on shape only: giving every stream
// its own scale (0.1-10) and offset (+-100) must not change any label.
test("z-normalized labels are invariant to a per-stream shift and scale", () => {
  const ds = generateSynthetic({ seed: 5, nStreams: 60, nTicks: 60, nClusters: 3 });
  const rand = mulberry32(99);
  const transforms = ds.dimensions.map(() => ({
    scale: 0.1 + 9.9 * rand(),
    offset: 200 * rand() - 100,
  }));
  const transformed = ds.rows.map((row) => {
    const out = { ...row };
    ds.dimensions.forEach((dim, i) => {
      out[dim] = transforms[i].scale * row[dim] + transforms[i].offset;
    });
    return out;
  });

  const settings = { eps: 0.6, minPts: 2, zNormalize: true, dataTicks: 60 };
  const before = aggregate(ds.rows, ds.dimensions, settings).clusterAssignment;
  const after = aggregate(transformed, ds.dimensions, settings).clusterAssignment;
  expect(after).toStrictEqual(before);
  // Sanity check: the data has real clusters, not all noise.
  expect(new Set(before.map(([, c]) => c).filter((c) => c >= 0)).size).toBe(3);
});

test("missing values do not break clustering (they are skipped)", () => {
  const complete = generateSynthetic({ seed: 8, nStreams: 30, nTicks: 80, nClusters: 3 });
  const gappy = generateSynthetic({
    seed: 8,
    nStreams: 30,
    nTicks: 80,
    nClusters: 3,
    missingRate: 0.1,
  });
  const settings = { eps: 0.6, minPts: 2, zNormalize: true, dataTicks: 80 };
  const a = aggregate(complete.rows, complete.dimensions, settings).clusterAssignment;
  const b = aggregate(gappy.rows, gappy.dimensions, settings).clusterAssignment;
  expect(b.filter(([, c]) => c === -1)).toHaveLength(0);
  expect(new Set(b.map(([, c]) => c)).size).toBe(new Set(a.map(([, c]) => c)).size);
});

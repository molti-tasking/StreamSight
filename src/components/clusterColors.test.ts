import { expect, test } from "vitest";
import { deltaE, minPairwiseDeltaE } from "@/lib/colorVision";
import { clusterColors, OUTLIER_COLOR } from "./clusterColors";

const contrastOnWhite = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
};

test("cluster colours stay distinguishable with colour-vision deficiencies", () => {
  // Smallest pairwise CIE76 difference over normal, protan, deutan and tritan
  // simulation (Machado et al. 2009, severity 1).
  expect(minPairwiseDeltaE(clusterColors)).toBeGreaterThan(13);
});

test("the previous palette did not (regression reference)", () => {
  const previousFirstEight = ["#FF0000", "#32CD32", "#4B0082", "#D2691E", "#0000FF", "#9932CC", "#FF1493", "#20B2AA"];
  expect(minPairwiseDeltaE(previousFirstEight)).toBeLessThan(6);
});

test("every cluster colour has at least 3:1 contrast on white", () => {
  for (const color of clusterColors) expect(contrastOnWhite(color)).toBeGreaterThanOrEqual(3);
});

test("the outlier grey is distinct from every cluster colour", () => {
  for (const d of ["normal", "protan", "deutan", "tritan"] as const)
    for (const color of clusterColors) expect(deltaE(color, OUTLIER_COLOR, d)).toBeGreaterThan(10);
});

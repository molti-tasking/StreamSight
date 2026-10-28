import { ColorSlots } from "@/lib/clustering/colorSlots";

/** Color used for the DBSCAN noise / outlier cluster (id -1). */
// Light grey: outliers are de-emphasised, and every darker grey collides
// with a cluster colour under simulated CVD (see clusterColors.test.ts).
export const OUTLIER_COLOR = "#BDBDBD";

/**
 * Categorical cluster palette, colour-vision-deficiency aware. Drawn from
 * Okabe & Ito and Paul Tol's "muted" scheme, ordered greedily so that the
 * smallest pairwise CIE76 difference stays as large as possible under normal,
 * protan, deutan and tritan vision (Machado et al. 2009): 13.5 for all 8
 * colours, where the previous 30-colour palette's first 8 reached 5.7 (its
 * red and lime-green ids 0 and 1 collide for deuteranopes). Light colours
 * with < 3:1 contrast against white are excluded so lines stay visible.
 * See clusterColors.test.ts.
 */
export const clusterColors: string[] = [
  "#0072B2", // blue (Okabe-Ito)
  "#D55E00", // vermillion (Okabe-Ito)
  "#882255", // wine (Tol)
  "#332288", // indigo (Tol)
  "#CC79A7", // reddish purple (Okabe-Ito)
  "#CC6677", // rose (Tol)
  "#117733", // green (Tol)
  "#999933", // olive (Tol)
];

/** Colour of anomaly markers: not a cluster colour; markers also differ in shape. */
export const ANOMALY_COLOR = "#111827";

const slots = new ColorSlots(clusterColors.length);

/** Call once per update with the clusters that exist now. */
export function updateClusterColorSlots(activeIds: number[]) {
  slots.update(activeIds);
}

/**
 * Resolve a stable cluster id to a color. Outliers (id -1) render gray. Other
 * clusters keep a palette slot for as long as they exist, so clusters on
 * screen at the same time get different colours (up to 8 of them).
 */
export function colorForClusterId(id: number): string {
  if (id < 0) return OUTLIER_COLOR;
  return clusterColors[slots.slotOf(id)];
}


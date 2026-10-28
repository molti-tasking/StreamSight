/**
 * Colour-vision utilities used to check that the cluster palette stays
 * distinguishable for viewers with colour-vision deficiencies.
 *
 * Simulation: Machado, Oliveira & Fernandes (2009), severity 1.0, applied in
 * linear sRGB. Difference: CIE76 ΔE in CIELAB (D65).
 */
export type Deficiency = "normal" | "protan" | "deutan" | "tritan";

const MACHADO: Record<Exclude<Deficiency, "normal">, number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255)) as [number, number, number];
}

function simulate(rgb: [number, number, number], deficiency: Deficiency): [number, number, number] {
  if (deficiency === "normal") return rgb;
  const m = MACHADO[deficiency];
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return m.map((row) => clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])) as [number, number, number];
}

function linearToLab([r, g, b]: [number, number, number]): [number, number, number] {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 colour difference between two hex colours as seen with `deficiency`. */
export function deltaE(a: string, b: string, deficiency: Deficiency = "normal"): number {
  const [la, aa, ba] = linearToLab(simulate(hexToLinear(a), deficiency));
  const [lb, ab, bb] = linearToLab(simulate(hexToLinear(b), deficiency));
  return Math.hypot(la - lb, aa - ab, ba - bb);
}

/** Smallest pairwise ΔE within a palette, over all deficiency types. */
export function minPairwiseDeltaE(
  palette: string[],
  deficiencies: Deficiency[] = ["normal", "protan", "deutan", "tritan"]
): number {
  let min = Infinity;
  for (const d of deficiencies)
    for (let i = 0; i < palette.length; i++)
      for (let j = i + 1; j < palette.length; j++) min = Math.min(min, deltaE(palette[i], palette[j], d));
  return min;
}

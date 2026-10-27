/**
 * Adjusted Rand index (Hubert & Arabie 1985) between two labelings of the
 * same items: 1 for identical partitions, about 0 for chance agreement.
 *
 * Label -1 (DBSCAN noise / ground-truth outlier) is not a cluster: every item
 * labelled -1 counts as its own singleton, so calling real cluster members
 * noise is penalised. Zero imports, so Node can load it directly (benchmarks).
 */
export function adjustedRandIndex(
  truth: ArrayLike<number>,
  predicted: ArrayLike<number>
): number {
  const n = truth.length;
  if (n !== predicted.length) throw new Error("labelings differ in length");
  if (n < 2) return 1;

  const key = (label: number, i: number) => (label === -1 ? `noise:${i}` : `c:${label}`);
  const rows = new Map<string, number>();
  const cols = new Map<string, number>();
  const cells = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const a = key(truth[i], i);
    const b = key(predicted[i], i);
    rows.set(a, (rows.get(a) ?? 0) + 1);
    cols.set(b, (cols.get(b) ?? 0) + 1);
    cells.set(`${a}|${b}`, (cells.get(`${a}|${b}`) ?? 0) + 1);
  }

  const pairs = (x: number) => (x * (x - 1)) / 2;
  const sum = (m: Map<string, number>) => {
    let s = 0;
    for (const v of m.values()) s += pairs(v);
    return s;
  };
  const index = sum(cells);
  const sumRows = sum(rows);
  const sumCols = sum(cols);
  const expected = (sumRows * sumCols) / pairs(n);
  const max = (sumRows + sumCols) / 2;
  if (max === expected) {
    // Degenerate (e.g. both all-singletons): identical partitions agree fully.
    return index === max ? 1 : 0;
  }
  return (index - expected) / (max - expected);
}

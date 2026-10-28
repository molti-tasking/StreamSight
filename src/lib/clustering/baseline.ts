/**
 * Change of each member stream since the start of the window: last finite
 * value minus first finite value (0 for a stream seen only once).
 */
export function changesSinceWindowStart(cluster: Record<string, number>[]) {
  const first = new Map<string, number>();
  const last = new Map<string, number>();
  for (const row of cluster) {
    for (const [key, value] of Object.entries(row)) {
      if (key === "timestamp" || !Number.isFinite(value)) continue;
      if (!first.has(key)) first.set(key, value);
      last.set(key, value);
    }
  }
  return [...first.keys()].flatMap((stream) =>
    first.get(stream) === undefined || last.get(stream) === undefined
      ? []
      : [{ stream, change: last.get(stream)! - first.get(stream)! }]
  );
}

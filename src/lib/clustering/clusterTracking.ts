/**
 * Stable cluster identity across ticks.
 *
 * The WASM clustering emits clusters in DBSCAN discovery order, so a cluster's
 * position (and thus its color) flickers as streams join/leave between ticks.
 * `ClusterTracker` matches each tick's clusters to the previous tick's by member
 * overlap and carries a stable id forward, so colors stay put while membership
 * evolves. Matching is JS-side (the WASM stays stateless / golden-safe) and
 * cheap: O(k^2) over the (few dozen) clusters.
 */

/** Overlap coefficient: |A ∩ B| / min(|A|, |B|) ∈ [0, 1]. */
export function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / small.size;
}

type TrackedCluster = { stableId: number; members: Set<string> };

/** A cluster must overlap a previous one by at least this fraction to inherit
 *  its id; otherwise it is treated as a newly formed cluster. */
const MATCH_THRESHOLD = 0.5;

export class ClusterTracker {
  private nextId = 0;
  private prev: TrackedCluster[] = [];

  /**
   * Assign a stable id to each current cluster. `currentMembers[i]` is the set
   * of member dimensions of the cluster at position `i`; the returned array is
   * index-aligned (`result[i]` = stable id for that cluster).
   *
   * Greedy by descending overlap, each previous cluster consumed at most once:
   * on a split the larger child (higher overlap) keeps the id and the other
   * gets a fresh one; on a merge the surviving id is the better-overlapping
   * (ties broken by lower id) and the rest are dropped.
   */
  track(currentMembers: string[][]): number[] {
    const curSets = currentMembers.map((m) => new Set(m));
    const result: number[] = new Array(currentMembers.length).fill(-1);

    type Candidate = { cur: number; prev: number; score: number };
    const candidates: Candidate[] = [];
    for (let c = 0; c < curSets.length; c++) {
      for (let p = 0; p < this.prev.length; p++) {
        const score = overlapCoefficient(curSets[c], this.prev[p].members);
        if (score >= MATCH_THRESHOLD) candidates.push({ cur: c, prev: p, score });
      }
    }
    // Best overlap first; tie-break toward the lower stable id for determinism.
    candidates.sort(
      (x, y) =>
        y.score - x.score ||
        this.prev[x.prev].stableId - this.prev[y.prev].stableId
    );

    const usedPrev = new Set<number>();
    for (const { cur, prev } of candidates) {
      if (result[cur] !== -1 || usedPrev.has(prev)) continue;
      result[cur] = this.prev[prev].stableId;
      usedPrev.add(prev);
    }

    // Mint fresh ids for clusters that matched nothing.
    for (let c = 0; c < result.length; c++) {
      if (result[c] === -1) result[c] = this.nextId++;
    }

    this.prev = currentMembers.map((m, c) => ({
      stableId: result[c],
      members: curSets[c],
    }));
    return result;
  }

  /** Forget history (e.g. when the dataset / dimensions change). */
  reset(): void {
    this.prev = [];
    this.nextId = 0;
  }
}

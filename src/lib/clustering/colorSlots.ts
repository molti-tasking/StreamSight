/**
 * Assigns palette slots to stable cluster ids. A cluster keeps its slot for
 * as long as it exists; slots of clusters that disappear are reused for new
 * ones (lowest free slot first). So clusters shown at the same time never
 * share a colour while there are at most `size` of them, unlike `id % size`,
 * where ids grow without bound and collide.
 */
export class ColorSlots {
  private slots = new Map<number, number>();
  private readonly size: number;

  constructor(size: number) {
    this.size = size;
  }

  /** Updates the assignment for the clusters that exist now. */
  update(activeIds: number[]): void {
    const active = new Set(activeIds.filter((id) => id >= 0));
    const used = new Set<number>();
    for (const id of active) {
      const slot = this.slots.get(id);
      if (slot !== undefined && !used.has(slot)) used.add(slot);
      else this.slots.delete(id);
    }
    for (const id of active) {
      if (this.slots.has(id)) continue;
      let slot = 0;
      while (used.has(slot) && slot < this.size) slot++;
      if (slot >= this.size) slot = id % this.size; // more clusters than colours
      used.add(slot);
      this.slots.set(id, slot);
    }
    // Forget clusters that are gone, unless their slot is still unclaimed:
    // a stream that just left such a cluster is drawn in its old colour.
    for (const [id, slot] of this.slots) {
      if (!active.has(id) && [...active].some((a) => this.slots.get(a) === slot)) {
        this.slots.delete(id);
      }
    }
  }

  slotOf(id: number): number {
    return this.slots.get(id) ?? ((id % this.size) + this.size) % this.size;
  }
}

import type { MemoryRecord } from "../types";
import { MemoryStore } from "../storage/MemoryStore";

export class EpisodicMemory {
  constructor(
    private readonly store: MemoryStore
  ) {}

  async storeRecord(record: MemoryRecord): Promise<void> {
    await this.store.save(record);
  }

  async retrieve(id: string): Promise<MemoryRecord | null> {
    return this.store.get(id);
  }

  async all(): Promise<MemoryRecord[]> {
    return this.store.getAll();
  }
}

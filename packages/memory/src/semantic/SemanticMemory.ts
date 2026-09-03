import type { MemoryRecord } from "../types";
import { MemoryStore } from "../storage/MemoryStore";

export class SemanticMemory {
  constructor(
    private readonly store: MemoryStore
  ) {}

  async storeRecord(record: MemoryRecord): Promise<void> {
    await this.store.save(record);
  }

  async retrieve(id: string): Promise<MemoryRecord | null> {
    return this.store.get(id);
  }

  async values(): Promise<MemoryRecord[]> {
    return this.store.getAll();
  }
}

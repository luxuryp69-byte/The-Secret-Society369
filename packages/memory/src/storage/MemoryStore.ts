import type { MemoryRecord } from "../types";

export class MemoryStore {
  private readonly storage = new Map<string, MemoryRecord>();

  async save(record: MemoryRecord): Promise<void> {
    this.storage.set(record.id, record);
  }

  async get(id: string): Promise<MemoryRecord | null> {
    return this.storage.get(id) ?? null;
  }

  async getAll(): Promise<MemoryRecord[]> {
    return [...this.storage.values()];
  }

  async delete(id: string): Promise<void> {
    this.storage.delete(id);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async count(): Promise<number> {
    return this.storage.size;
  }
}
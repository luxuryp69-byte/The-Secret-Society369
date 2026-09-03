import { MemoryStore } from "../storage/MemoryStore";

export class MemoryStatistics {
  constructor(
    private readonly store: MemoryStore
  ) {}

  async totalRecords(): Promise<number> {
    return (await this.store.getAll()).length;
  }

  async isEmpty(): Promise<boolean> {
    return (await this.totalRecords()) === 0;
  }
}

import type { MemoryRecord } from "../types";

export interface MemorySnapshot {
  createdAt: Date;

  records: MemoryRecord[];
}

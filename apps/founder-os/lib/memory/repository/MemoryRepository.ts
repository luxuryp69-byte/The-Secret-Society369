import type { FounderMemory } from "../types";

export interface MemoryRepository {
  load(ownerId: string): Promise<FounderMemory>;

  save(
    ownerId: string,
    memory: FounderMemory
  ): Promise<void>;

  exists(ownerId: string): Promise<boolean>;

  delete(ownerId: string): Promise<void>;

  export(ownerId: string): Promise<FounderMemory>;
}

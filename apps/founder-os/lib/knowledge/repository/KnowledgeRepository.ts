import type { KnowledgeItem } from "../types";

export interface KnowledgeRepository {
  list(): Promise<KnowledgeItem[]>;
  get(id: string): Promise<KnowledgeItem | null>;
  findByFingerprint(
    contentHash: string,
  ): Promise<KnowledgeItem | null>;
  save(item: KnowledgeItem): Promise<void>;
  upsert(item: KnowledgeItem): Promise<KnowledgeItem>;
  delete(id: string): Promise<void>;
}

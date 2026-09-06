import type { KnowledgeItem } from "../types";

export interface KnowledgeRepository {
  list(): Promise<KnowledgeItem[]>;
  get(id: string): Promise<KnowledgeItem | null>;
  save(item: KnowledgeItem): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface KnowledgeEntity {
  id: string;
  type: string;
  title: string;
  summary?: string;
  confidence?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeSearchOptions {
  limit?: number;
  threshold?: number;
  semantic?: boolean;
}

export interface KnowledgeSearchResult {
  entities: KnowledgeEntity[];
  total: number;
}

export interface MemoryRecord {
  id: string;
  category: string;
  content: string;
  createdAt?: string;
  importance?: number;
}

export interface RememberOptions {
  importance?: number;
  category?: string;
}
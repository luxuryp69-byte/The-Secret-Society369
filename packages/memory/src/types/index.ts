export interface MemoryRecord {
  id: string;

  type: string;

  createdAt: Date;

  metadata?: Record<string, unknown>;

  content?: unknown;
}

export interface MemoryQuery {
  text: string;

  limit?: number;
}

export interface MemorySearchResult {
  id: string;

  score: number;
}

export interface MemoryMetadata {
  source?: string;

  tags?: string[];

  confidence?: number;
}

export interface MemoryHealth {
  healthy: boolean;

  records: number;
}

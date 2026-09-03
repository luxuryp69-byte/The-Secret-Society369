export interface KnowledgeRelation {
  source: string;
  target: string;
  type: string;
}

export interface KnowledgeSearchQuery {
  text: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  id: string;
  score: number;
}

export interface KnowledgeEmbedding {
  id: string;
  vector: number[];
}
export type KnowledgeVerificationStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "STALE"
  | "DISPUTED"
  | "REJECTED";

export type KnowledgeSourceType =
  | "official"
  | "government"
  | "academic"
  | "research"
  | "news"
  | "company"
  | "community"
  | "other";

export interface KnowledgeSource {
  title: string;
  url: string;
  publisher: string;
  type: KnowledgeSourceType;
}

export interface KnowledgeItem {
  id: string;
  claim: string;
  source: KnowledgeSource;
  topic: string;
  geography?: string;
  publishedAt?: string;
  verifiedAt?: string;
  expiresAt?: string;
  confidence: number;
  verificationStatus: KnowledgeVerificationStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSearchOptions {
  topic?: string;
  geography?: string;
  tags?: string[];
  verifiedOnly?: boolean;
  limit?: number;
}

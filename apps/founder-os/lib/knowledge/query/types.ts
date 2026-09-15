import type { KnowledgeItem, KnowledgeVerificationStatus } from "../types";
import type { TrustedAnswer } from "../answers/trustedAnswer";

export interface KnowledgeQueryOptions {
  topic?: string;
  geography?: string;
  tags?: string[];
  verifiedOnly?: boolean;
  limit?: number;
}

export interface KnowledgeQueryCandidate {
  item: KnowledgeItem;
  score: number;
  verification: {
    status: KnowledgeVerificationStatus;
    authorityScore: number;
    corroborated: boolean;
    supportingSources: number;
    conflictingSources: number;
    reason: string;
  };
}

export interface KnowledgeQueryResult {
  query: string;
  matchedItems: number;
  candidates: KnowledgeQueryCandidate[];
  trustedAnswer: TrustedAnswer | null;
  status: KnowledgeVerificationStatus | "NO_MATCH";
}

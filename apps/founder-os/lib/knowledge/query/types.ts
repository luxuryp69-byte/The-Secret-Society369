import type { KnowledgeVerificationStatus } from "../types";
import type { TrustedAnswer } from "../answers/trustedAnswer";

export interface KnowledgeQueryOptions {
  topic?: string;
  geography?: string;
  tags?: string[];
  verifiedOnly?: boolean;
  limit?: number;
}

export interface KnowledgeQueryResult {
  query: string;
  matchedItems: number;
  trustedAnswer: TrustedAnswer | null;
  status: KnowledgeVerificationStatus | "NO_MATCH";
}

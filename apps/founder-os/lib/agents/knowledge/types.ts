import type {
  KnowledgeVerificationStatus,
} from "../../knowledge/types";
import type {
  TrustedAnswer,
  TrustedAnswerEvidence,
  TrustedAnswerSource,
} from "../../knowledge/answers/trustedAnswer";
import type {
  KnowledgeQueryCandidate,
  KnowledgeQueryResult,
} from "../../knowledge/query/types";

export type AgentKnowledgeAvailability =
  | "AVAILABLE"
  | "WARNING"
  | "BLOCKED"
  | "NO_MATCH";

export type AgentKnowledgeBlockReason =
  | "DISPUTED"
  | "REJECTED"
  | "NO_MATCH";

export interface AgentKnowledgeContext {
  query: string;
  availability: AgentKnowledgeAvailability;
  status: KnowledgeVerificationStatus | "NO_MATCH";
  answer: string | null;
  confidence: number;
  canUseAsTrustedContext: boolean;
  matchedItems: number;
  sources: TrustedAnswerSource[];
  evidence: TrustedAnswerEvidence[];
  candidates: KnowledgeQueryCandidate[];
  warnings: TrustedAnswer["warnings"];
  blockReason?: AgentKnowledgeBlockReason;
  explanation: string;
}

export interface AgentKnowledgeQueryOptions {
  topic?: string;
  geography?: string;
  tags?: string[];
  verifiedOnly?: boolean;
  limit?: number;
}

export interface KnowledgeQueryPort {
  query(
    query: string,
    options?: AgentKnowledgeQueryOptions,
  ): Promise<KnowledgeQueryResult>;
}

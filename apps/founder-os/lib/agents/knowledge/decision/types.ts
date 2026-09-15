import type {
  KnowledgeVerificationStatus,
} from "../../../knowledge/types";

import type {
  TrustedAnswerEvidence,
  TrustedAnswerSource,
} from "../../../knowledge/answers/trustedAnswer";

export type KnowledgeDecisionClassification =
  | "FACT"
  | "INFERENCE"
  | "ASSUMPTION"
  | "UNKNOWN";

export type KnowledgeDecisionAvailability =
  | "AVAILABLE"
  | "WARNING"
  | "BLOCKED"
  | "NO_MATCH";

export interface KnowledgeDecisionEvidence {
  itemId: string;
  claim: string;
  status: KnowledgeVerificationStatus;
  confidence: number;
  authorityScore: number;
  corroborated: boolean;
  supportingSources: number;
  conflictingSources: number;
  reason: string;
}

export interface AgentKnowledgeDecisionContext {
  query: string;

  availability: KnowledgeDecisionAvailability;

  status: KnowledgeVerificationStatus | "NO_MATCH";

  classification: KnowledgeDecisionClassification;

  canUseAsTrustedContext: boolean;

  answer: string | null;

  facts: string[];

  inferences: string[];

  assumptions: string[];

  unknowns: string[];

  confidence: number;

  sources: TrustedAnswerSource[];

  evidence: KnowledgeDecisionEvidence[];

  warnings: string[];

  explanation: string;
}

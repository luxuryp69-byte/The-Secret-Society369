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
  /**
   * Source URLs belonging to this evidence item. Optional so older
   * hand-built contexts remain structurally compatible.
   */
  sourceUrls?: string[];
  confidence: number;
  authorityScore: number;
  corroborated: boolean;
  supportingSources: number;
  conflictingSources: number;
  reason: string;
}

export interface KnowledgeDecisionEvidenceCitation {
  itemId: string;
  claim?: string;
  sourceUrl?: string;
  status?: KnowledgeVerificationStatus;
  confidence?: number;
}

export interface KnowledgeDecisionLLMMetadata {
  classification?: KnowledgeDecisionClassification;
  knowledgeConfidence?: number;
  decisionConfidence?: number;
  facts?: string[];
  inferences?: string[];
  assumptions?: string[];
  unknowns?: string[];
  evidence?: KnowledgeDecisionEvidenceCitation[];
  sources?: string[];
  warnings?: string[];
}

export interface KnowledgeDecisionValidationResult {
  valid: boolean;
  classification: KnowledgeDecisionClassification;
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

  knowledgeConfidence: number;

  sources: TrustedAnswerSource[];

  evidence: KnowledgeDecisionEvidence[];

  warnings: string[];

  explanation: string;
}

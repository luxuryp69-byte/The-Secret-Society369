import type {
  StrategicSignal,
} from "../ceo";
import type {
  KnowledgeDecisionClassification,
  KnowledgeDecisionEvidence,
  KnowledgeDecisionValidationResult,
  AgentKnowledgeDecisionContext,
} from "../knowledge/decision/types";
import type {
  TrustedAnswerSource,
} from "../../knowledge/answers/trustedAnswer";

export type DecisionTraceResolution =
  | "LLM"
  | "DETERMINISTIC_FALLBACK";

export type TraceExcludedInformationCategory =
  | "KNOWLEDGE"
  | "EVIDENCE"
  | "SOURCE"
  | "FACT"
  | "INFERENCE"
  | "ASSUMPTION";

export interface DecisionTraceInput {
  message: string;
}

export interface TraceEvidenceReference {
  itemId: string;
  claim: string;
  sourceUrl?: string;
  sourceUrls: string[];
  status: KnowledgeDecisionEvidence["status"];
  confidence: number;
  authorityScore: number;
  corroborated: boolean;
  supportingSources: number;
  conflictingSources: number;
  reason: string;
}

export type TraceSourceReference = Readonly<TrustedAnswerSource>;

export interface TraceExcludedInformation {
  category: TraceExcludedInformationCategory;
  reference?: string;
  reason: string;
}

export interface TraceKnowledge {
  query: string;
  availability: AgentKnowledgeDecisionContext["availability"];
  status: AgentKnowledgeDecisionContext["status"];
  classification: KnowledgeDecisionClassification;
  canUseAsTrustedContext: boolean;
  knowledgeConfidence: number;
  evidence: TraceEvidenceReference[];
  sources: TraceSourceReference[];
  warnings: string[];
  excludedInformation: TraceExcludedInformation[];
}

export interface TraceCEOOutput {
  primaryPriority: string;
  why: string;
  plan: string[];
  successCriteria: string[];
  whatNotToPrioritize: string;
}

export interface TraceDecisionMetadata {
  resolution: DecisionTraceResolution;
  classification?: KnowledgeDecisionClassification;
  decisionConfidence?: number;
  acceptedEvidence?: TraceEvidenceReference[];
  validation?: KnowledgeDecisionValidationResult;
  fallbackReason?: string;
  inferences?: string[];
  assumptions?: string[];
  unknowns?: string[];
  warnings?: string[];
}

export interface TraceDecision {
  output: TraceCEOOutput;
  resolution: DecisionTraceResolution;
  classification?: KnowledgeDecisionClassification;
  decisionConfidence?: number;
  knowledgeConfidence: number;
  acceptedEvidence: TraceEvidenceReference[];
  validation?: KnowledgeDecisionValidationResult;
  fallbackReason?: string;
}

export interface TraceExplanation {
  facts: string[];
  inferences: string[];
  assumptions: string[];
  unknowns: string[];
  warnings: string[];
  strategicConstraints: StrategicSignal["constraint"][];
  excludedInformation: TraceExcludedInformation[];
}

export interface DecisionTrace {
  traceId: string;
  createdAt: string;
  input: DecisionTraceInput;
  strategicSignal: StrategicSignal;
  knowledge: TraceKnowledge;
  decision: TraceDecision;
  explanation: TraceExplanation;
}

export interface DecisionTraceBuildInput {
  traceId: string;
  createdAt: string;
  input: DecisionTraceInput;
  strategicSignal: StrategicSignal;
  knowledge: AgentKnowledgeDecisionContext;
  decision: {
    output: TraceCEOOutput;
    metadata: TraceDecisionMetadata;
  };
  excludedInformation?: TraceExcludedInformation[];
}

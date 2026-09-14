import type {
  KnowledgeItem,
  KnowledgeVerificationStatus,
} from "../types";

export type TrustedAnswerWarning =
  | "DISPUTED"
  | "STALE"
  | "UNVERIFIED"
  | "REJECTED";

export interface TrustedAnswerSource {
  title: string;
  publisher: string;
  url: string;
  type: KnowledgeItem["source"]["type"];
  publishedAt?: string;
  fetchedAt?: string;
  verifiedAt?: string;
}

export interface TrustedAnswerEvidence {
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

export interface TrustedAnswer {
  answer: string;
  confidence: number;
  status: KnowledgeVerificationStatus;
  sources: TrustedAnswerSource[];
  evidence: TrustedAnswerEvidence[];
  warnings: TrustedAnswerWarning[];
  explanation: string;
}

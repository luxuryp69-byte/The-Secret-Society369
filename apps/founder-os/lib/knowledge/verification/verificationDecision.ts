import type { KnowledgeVerificationStatus } from "../types";
import type { VerificationEvidenceSummary } from "./verificationEvidence";

export interface VerificationDecision {
  status: KnowledgeVerificationStatus;
  explanation: string;
  evidence: VerificationEvidenceSummary;
}

export function createVerificationDecision(
  status: KnowledgeVerificationStatus,
  evidence: VerificationEvidenceSummary,
): VerificationDecision {
  return {
    status,
    explanation: evidence.explanation,
    evidence,
  };
}

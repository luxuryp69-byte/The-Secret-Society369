import type { KnowledgeItem } from "../types";
import { LocalKnowledgeConflictRepository } from "../conflicts/conflictRepository";
import {
  verifyClaim,
  type VerificationResult,
} from "./verifyClaim";
import {
  buildVerificationEvidence,
  type VerificationEvidenceSummary,
} from "./verificationEvidence";
import {
  createVerificationDecision,
  type VerificationDecision,
} from "./verificationDecision";

export interface VerificationOrchestratorOptions {
  conflictRepository?: LocalKnowledgeConflictRepository;
  now?: Date;
}

export interface ExplainableVerificationResult
  extends VerificationResult {
  decision: VerificationDecision;
  evidence: VerificationEvidenceSummary;
}

export async function verifyKnowledgeItem(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
  options: VerificationOrchestratorOptions = {},
): Promise<ExplainableVerificationResult> {
  const repository =
    options.conflictRepository ??
    new LocalKnowledgeConflictRepository();

  const now = options.now ?? new Date();

  const activeConflicts = (
    await repository.listByItem(item.id)
  ).filter(
    (conflict) =>
      conflict.status === "OPEN" ||
      conflict.status === "REVIEWING",
  );

  if (activeConflicts.length > 0) {
    const normalVerification = verifyClaim(
      item,
      existingItems,
      now,
    );

    const verification: VerificationResult = {
      status: "DISPUTED",
      authorityScore: normalVerification.authorityScore,
      corroborated: false,
      supportingSources: 0,
      conflictingSources: activeConflicts.length,
      reason: activeConflicts
        .map((conflict) => conflict.reason)
        .join(" "),
    };

    return buildResult(item, verification, existingItems, now);
  }

  const verification = verifyClaim(
    item,
    existingItems,
    now,
  );

  return buildResult(item, verification, existingItems, now);
}

function buildResult(
  item: KnowledgeItem,
  verification: VerificationResult,
  existingItems: KnowledgeItem[],
  now: Date,
): ExplainableVerificationResult {
  const evidence = buildVerificationEvidence(
    item,
    existingItems,
    verification,
    now,
  );

  const decision = createVerificationDecision(
    verification.status,
    evidence,
  );

  return {
    ...verification,
    decision,
    evidence,
  };
}

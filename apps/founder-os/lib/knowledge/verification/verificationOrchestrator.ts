import type { KnowledgeItem } from "../types";
import { LocalKnowledgeConflictRepository } from "../conflicts/conflictRepository";
import { verifyClaim, type VerificationResult } from "./verifyClaim";

export interface VerificationOrchestratorOptions {
  conflictRepository?: LocalKnowledgeConflictRepository;
  now?: Date;
}

export async function verifyKnowledgeItem(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
  options: VerificationOrchestratorOptions = {},
): Promise<VerificationResult> {
  const repository =
    options.conflictRepository ??
    new LocalKnowledgeConflictRepository();

  const activeConflicts = (
    await repository.listByItem(item.id)
  ).filter(
    (conflict) =>
      conflict.status === "OPEN" ||
      conflict.status === "REVIEWING",
  );

  if (activeConflicts.length > 0) {
    const authorityScore =
      getAuthorityScoreFromVerification(
        item,
        existingItems,
        options.now,
      );

    return {
      status: "DISPUTED",
      authorityScore,
      corroborated: false,
      supportingSources: 0,
      conflictingSources: activeConflicts.length,
      reason: activeConflicts
        .map((conflict) => conflict.reason)
        .join(" "),
    };
  }

  return verifyClaim(
    item,
    existingItems,
    options.now,
  );
}

function getAuthorityScoreFromVerification(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
  now?: Date,
): number {
  const result = verifyClaim(
    item,
    existingItems,
    now,
  );

  return result.authorityScore;
}

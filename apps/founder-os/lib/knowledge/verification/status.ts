import type {
  KnowledgeItem,
  KnowledgeVerificationStatus,
} from "../types";

export function calculateVerificationStatus(
  item: KnowledgeItem,
  now = new Date(),
): KnowledgeVerificationStatus {
  if (item.verificationStatus === "REJECTED") {
    return "REJECTED";
  }

  if (item.verificationStatus === "DISPUTED") {
    return "DISPUTED";
  }

  if (item.expiresAt) {
    const expiresAt = new Date(item.expiresAt);

    if (
      Number.isFinite(expiresAt.getTime()) &&
      expiresAt.getTime() <= now.getTime()
    ) {
      return "STALE";
    }
  }

  return item.verificationStatus;
}

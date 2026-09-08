import type { KnowledgeItem } from "../types";
import { getSourceAuthority } from "./authority";
import { calculateCorroboration } from "./corroboration";
import { calculateVerificationStatus } from "./status";

export interface VerificationResult {
  status: KnowledgeItem["verificationStatus"];
  authorityScore: number;
  corroborated: boolean;
  supportingSources: number;
  reason: string;
}

export function verifyClaim(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
  now = new Date(),
): VerificationResult {
  const authorityScore = getSourceAuthority(item.source.type);

  if (item.verificationStatus === "REJECTED") {
    return {
      status: "REJECTED",
      authorityScore,
      corroborated: false,
      supportingSources: 0,
      reason: "The claim was explicitly rejected.",
    };
  }

  if (item.verificationStatus === "DISPUTED") {
    return {
      status: "DISPUTED",
      authorityScore,
      corroborated: false,
      supportingSources: 0,
      reason: "The claim is explicitly disputed.",
    };
  }

  const freshnessStatus = calculateVerificationStatus(item, now);

  if (freshnessStatus === "STALE") {
    return {
      status: "STALE",
      authorityScore,
      corroborated: false,
      supportingSources: 0,
      reason: "The claim has passed its expiration date.",
    };
  }

  const corroboration = calculateCorroboration(item, existingItems);

  if (
    authorityScore >= 90 &&
    corroboration.corroborated &&
    item.confidence >= 70
  ) {
    return {
      status: "VERIFIED",
      authorityScore,
      corroborated: true,
      supportingSources: corroboration.supportingSources,
      reason:
        "High-authority source, sufficient confidence, and corroborating evidence.",
    };
  }

  if (authorityScore >= 90 && item.confidence >= 85) {
    return {
      status: "VERIFIED",
      authorityScore,
      corroborated: false,
      supportingSources: 0,
      reason: "High-authority source with high confidence.",
    };
  }

  return {
    status: "UNVERIFIED",
    authorityScore,
    corroborated: corroboration.corroborated,
    supportingSources: corroboration.supportingSources,
    reason: "Additional evidence is required before verification.",
  };
}

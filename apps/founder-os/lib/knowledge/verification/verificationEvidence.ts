import type { KnowledgeItem } from "../types";

export type VerificationEvidenceType =
  | "SOURCE_AUTHORITY"
  | "FRESHNESS"
  | "CORROBORATION"
  | "CONFIDENCE"
  | "CONFLICT";

export interface VerificationEvidence {
  type: VerificationEvidenceType;
  signal: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  score: number;
  reason: string;
  sourceUrl?: string;
}

export interface VerificationEvidenceSummary {
  evidence: VerificationEvidence[];
  positiveSignals: number;
  negativeSignals: number;
  explanation: string;
}

export function buildVerificationEvidence(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
  verification: {
    authorityScore: number;
    corroborated: boolean;
    supportingSources: number;
    conflictingSources: number;
  },
  now = new Date(),
): VerificationEvidenceSummary {
  const evidence: VerificationEvidence[] = [];

  evidence.push({
    type: "SOURCE_AUTHORITY",
    signal:
      verification.authorityScore >= 80
        ? "POSITIVE"
        : verification.authorityScore >= 50
          ? "NEUTRAL"
          : "NEGATIVE",
    score: verification.authorityScore,
    reason:
      verification.authorityScore >= 80
        ? "The source has high authority."
        : verification.authorityScore >= 50
          ? "The source has moderate authority."
          : "The source has low authority.",
    sourceUrl: item.source.url,
  });

  evidence.push({
    type: "CONFIDENCE",
    signal:
      item.confidence >= 80
        ? "POSITIVE"
        : item.confidence >= 50
          ? "NEUTRAL"
          : "NEGATIVE",
    score: item.confidence,
    reason:
      item.confidence >= 80
        ? "The knowledge item has high confidence."
        : item.confidence >= 50
          ? "The knowledge item has moderate confidence."
          : "The knowledge item has low confidence.",
  });

  const freshness = getFreshnessScore(item, now);

  evidence.push({
    type: "FRESHNESS",
    signal:
      freshness >= 80
        ? "POSITIVE"
        : freshness >= 50
          ? "NEUTRAL"
          : "NEGATIVE",
    score: freshness,
    reason:
      freshness >= 80
        ? "The knowledge item is considered fresh."
        : freshness >= 50
          ? "The knowledge item has moderate freshness."
          : "The knowledge item is stale.",
  });

  evidence.push({
    type: "CORROBORATION",
    signal: verification.corroborated
      ? "POSITIVE"
      : verification.supportingSources > 0
        ? "NEUTRAL"
        : "NEGATIVE",
    score: verification.supportingSources,
    reason:
      verification.supportingSources > 0
        ? `The claim has ${verification.supportingSources} supporting source(s).`
        : "No independent supporting source was found.",
  });

  evidence.push({
    type: "CONFLICT",
    signal:
      verification.conflictingSources > 0 ? "NEGATIVE" : "POSITIVE",
    score: verification.conflictingSources,
    reason:
      verification.conflictingSources > 0
        ? `The claim has ${verification.conflictingSources} conflicting source(s).`
        : "No conflicting source was found.",
  });

  const positiveSignals = evidence.filter(
    (entry) => entry.signal === "POSITIVE",
  ).length;

  const negativeSignals = evidence.filter(
    (entry) => entry.signal === "NEGATIVE",
  ).length;

  return {
    evidence,
    positiveSignals,
    negativeSignals,
    explanation: buildExplanation(
      item,
      verification,
      positiveSignals,
      negativeSignals,
    ),
  };
}

function getFreshnessScore(
  item: KnowledgeItem,
  now: Date,
): number {
  if (!item.expiresAt) {
    return 100;
  }

  const expiration = new Date(item.expiresAt).getTime();
  const current = now.getTime();

  if (expiration <= current) {
    return 0;
  }

  const published = item.publishedAt
    ? new Date(item.publishedAt).getTime()
    : item.createdAt
      ? new Date(item.createdAt).getTime()
      : current;

  if (expiration <= published) {
    return 100;
  }

  const lifetime = expiration - published;
  const remaining = expiration - current;

  return Math.max(
    0,
    Math.min(100, Math.round((remaining / lifetime) * 100)),
  );
}

function buildExplanation(
  item: KnowledgeItem,
  verification: {
    authorityScore: number;
    corroborated: boolean;
    supportingSources: number;
    conflictingSources: number;
  },
  positiveSignals: number,
  negativeSignals: number,
): string {
  const parts = [
    `Source authority score: ${verification.authorityScore}/100.`,
    `Confidence: ${item.confidence}/100.`,
    verification.corroborated
      ? "The claim is corroborated by independent evidence."
      : "The claim does not have sufficient independent corroboration.",
    verification.conflictingSources > 0
      ? `There are ${verification.conflictingSources} conflicting source(s).`
      : "No active conflicting source was found.",
    `Evidence summary: ${positiveSignals} positive signal(s), ${negativeSignals} negative signal(s).`,
  ];

  return parts.join(" ");
}

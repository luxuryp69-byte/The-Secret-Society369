import type { KnowledgeItem } from "../types";
import type { VerificationResult } from "../verification/verifyClaim";
import type { TrustedAnswer, TrustedAnswerEvidence, TrustedAnswerWarning } from "./trustedAnswer";

export interface TrustedAnswerInput {
  answer: string;
  item: KnowledgeItem;
  verification: VerificationResult;
}

export function buildTrustedAnswer(
  input: TrustedAnswerInput,
): TrustedAnswer {
  const {
    answer,
    item,
    verification,
  } = input;

  const evidence: TrustedAnswerEvidence = {
    itemId: item.id,
    claim: item.claim,
    status: verification.status,
    confidence: item.confidence,
    authorityScore: verification.authorityScore,
    corroborated: verification.corroborated,
    supportingSources: verification.supportingSources,
    conflictingSources: verification.conflictingSources,
    reason: verification.reason,
  };

  const warnings = buildWarnings(
    verification.status,
    verification.conflictingSources,
  );

  const source = buildSource(item);

  return {
    answer,
    confidence: calculateConfidence(
      item,
      verification,
    ),
    status: verification.status,
    sources: [source],
    evidence: [evidence],
    warnings,
    explanation: buildExplanation(
      verification,
      warnings,
    ),
  };
}

function buildSource(
  item: KnowledgeItem,
) {
  return {
    title: item.source.title,
    publisher: item.source.publisher,
    url: item.source.url,
    type: item.source.type,
    publishedAt:
      item.publishedAt ??
      item.provenance?.publishedAt,
    fetchedAt:
      item.provenance?.fetchedAt,
    verifiedAt:
      item.verifiedAt ??
      item.provenance?.verifiedAt,
  };
}

function calculateConfidence(
  item: KnowledgeItem,
  verification: VerificationResult,
): number {
  if (verification.status === "REJECTED") {
    return 0;
  }

  if (verification.status === "DISPUTED") {
    return Math.min(
      item.confidence,
      verification.authorityScore,
    );
  }

  if (verification.status === "STALE") {
    return Math.min(
      item.confidence,
      40,
    );
  }

  const corroborationBonus =
    verification.corroborated
      ? 10
      : 0;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        item.confidence * 0.6 +
          verification.authorityScore * 0.4 +
          corroborationBonus,
      ),
    ),
  );
}

function buildWarnings(
  status: VerificationResult["status"],
  conflictingSources: number,
): TrustedAnswerWarning[] {
  const warnings = new Set<TrustedAnswerWarning>();

  if (status === "DISPUTED" || conflictingSources > 0) {
    warnings.add("DISPUTED");
  }

  if (status === "STALE") {
    warnings.add("STALE");
  }

  if (status === "UNVERIFIED") {
    warnings.add("UNVERIFIED");
  }

  if (status === "REJECTED") {
    warnings.add("REJECTED");
  }

  return [...warnings];
}

function buildExplanation(
  verification: VerificationResult,
  warnings: TrustedAnswerWarning[],
): string {
  if (warnings.length === 0) {
    return [
      `Verification status: ${verification.status}.`,
      `Authority score: ${verification.authorityScore}/100.`,
      verification.corroborated
        ? "The claim is corroborated by independent evidence."
        : "The claim has no independent corroboration.",
    ].join(" ");
  }

  return [
    `Verification status: ${verification.status}.`,
    verification.reason,
    `Warnings: ${warnings.join(", ")}.`,
  ].join(" ");
}

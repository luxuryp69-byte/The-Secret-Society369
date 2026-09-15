import type {
  KnowledgeItem,
  KnowledgeVerificationStatus,
} from "../types";
import type { VerificationResult } from "../verification/verifyClaim";
import type {
  TrustedAnswer,
  TrustedAnswerEvidence,
  TrustedAnswerWarning,
} from "./trustedAnswer";

export interface TrustedAnswerInput {
  answer: string;
  item: KnowledgeItem;
  verification: VerificationResult;
}

export interface TrustedAnswerAggregateInput {
  answer: string;
  items: KnowledgeItem[];
  verifications: Array<{
    item: KnowledgeItem;
    verification: VerificationResult;
  }>;
}

export function buildTrustedAnswer(
  input: TrustedAnswerInput,
): TrustedAnswer {
  return buildTrustedAnswerFromEvidence({
    answer: input.answer,
    items: [input.item],
    verifications: [
      {
        item: input.item,
        verification: input.verification,
      },
    ],
  });
}

export function buildAggregatedTrustedAnswer(
  input: TrustedAnswerAggregateInput,
): TrustedAnswer {
  return buildTrustedAnswerFromEvidence({
    answer: input.answer,
    items: input.items,
    verifications: input.verifications,
  });
}

function buildTrustedAnswerFromEvidence(
  input: TrustedAnswerAggregateInput,
): TrustedAnswer {
  const evidence = input.verifications.map(
    ({ item, verification }) =>
      buildEvidence(item, verification),
  );

  const sources = uniqueSources(
    input.verifications.map(({ item }) =>
      buildSource(item),
    ),
  );

  const status = aggregateStatus(
    input.verifications,
  );

  const warnings = buildWarnings(
    status,
    input.verifications,
  );

  return {
    answer: input.answer,
    confidence: calculateAggregateConfidence(
      input.verifications,
      status,
    ),
    status,
    sources,
    evidence,
    warnings,
    explanation: buildAggregateExplanation(
      status,
      input.verifications,
      sources.length,
      warnings,
    ),
  };
}

function buildEvidence(
  item: KnowledgeItem,
  verification: VerificationResult,
): TrustedAnswerEvidence {
  return {
    itemId: item.id,
    claim: item.claim,
    status: verification.status,
    confidence: item.confidence,
    authorityScore: verification.authorityScore,
    corroborated: verification.corroborated,
    supportingSources:
      verification.supportingSources,
    conflictingSources:
      verification.conflictingSources,
    reason: verification.reason,
  };
}

function buildSource(
  item: KnowledgeItem,
): TrustedAnswer["sources"][number] {
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

function uniqueSources(
  sources: TrustedAnswer["sources"],
): TrustedAnswer["sources"] {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = [
      source.url,
      source.publisher,
      source.title,
    ]
      .map((value) =>
        value.toLowerCase().trim(),
      )
      .join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function aggregateStatus(
  verifications: Array<{
    item: KnowledgeItem;
    verification: VerificationResult;
  }>,
): KnowledgeVerificationStatus {
  if (verifications.length === 0) {
    return "UNVERIFIED";
  }

  const primary = verifications[0].verification;

  if (primary.status === "REJECTED") {
    return "REJECTED";
  }

  if (
    primary.status === "DISPUTED" ||
    primary.conflictingSources > 0
  ) {
    return "DISPUTED";
  }

  if (primary.status === "STALE") {
    return "STALE";
  }

  if (primary.status === "UNVERIFIED") {
    return "UNVERIFIED";
  }

  if (primary.status === "VERIFIED") {
    const hasSupportingConflict =
      verifications
        .slice(1)
        .some(
          ({ verification }) =>
            verification.status ===
              "DISPUTED" ||
            verification.conflictingSources > 0,
        );

    if (hasSupportingConflict) {
      return "DISPUTED";
    }

    return "VERIFIED";
  }

  return "UNVERIFIED";
}

function calculateAggregateConfidence(
  verifications: Array<{
    item: KnowledgeItem;
    verification: VerificationResult;
  }>,
  status: KnowledgeVerificationStatus,
): number {
  if (verifications.length === 0) {
    return 0;
  }

  if (status === "REJECTED") {
    return 0;
  }

  if (status === "STALE") {
    return Math.min(
      40,
      ...verifications.map(
        ({ item }) => item.confidence,
      ),
    );
  }

  if (status === "DISPUTED") {
    return Math.min(
      ...verifications.map(
        ({ item, verification }) =>
          Math.min(
            item.confidence,
            verification.authorityScore,
          ),
      ),
    );
  }

  const primary = verifications[0];

  const primaryConfidence = Math.min(
    100,
    Math.round(
      primary.item.confidence * 0.6 +
        primary.verification.authorityScore *
          0.4 +
        (primary.verification.corroborated
          ? 10
          : 0),
    ),
  );

  if (verifications.length === 1) {
    return primaryConfidence;
  }

  const supporting = verifications
    .slice(1)
    .map(({ item, verification }) =>
      Math.min(
        100,
        Math.round(
          item.confidence * 0.6 +
            verification.authorityScore *
              0.4 +
            (verification.corroborated
              ? 10
              : 0),
        ),
      ),
    );

  const averageSupporting =
    supporting.reduce(
      (sum, confidence) =>
        sum + confidence,
      0,
    ) / supporting.length;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        primaryConfidence * 0.7 +
          averageSupporting * 0.3,
      ),
    ),
  );
}

function buildWarnings(
  status: KnowledgeVerificationStatus,
  verifications: Array<{
    item: KnowledgeItem;
    verification: VerificationResult;
  }>,
): TrustedAnswerWarning[] {
  const warnings = new Set<TrustedAnswerWarning>();

  if (
    status === "DISPUTED" ||
    verifications.some(
      ({ verification }) =>
        verification.conflictingSources > 0,
    )
  ) {
    warnings.add("DISPUTED");
  }

  if (
    status === "STALE" ||
    verifications.some(
      ({ verification }) =>
        verification.status === "STALE",
    )
  ) {
    warnings.add("STALE");
  }

  if (
    status === "UNVERIFIED" ||
    verifications.some(
      ({ verification }) =>
        verification.status ===
        "UNVERIFIED",
    )
  ) {
    warnings.add("UNVERIFIED");
  }

  if (status === "REJECTED") {
    warnings.add("REJECTED");
  }

  return [...warnings];
}

function buildAggregateExplanation(
  status: KnowledgeVerificationStatus,
  verifications: Array<{
    item: KnowledgeItem;
    verification: VerificationResult;
  }>,
  sourceCount: number,
  warnings: TrustedAnswerWarning[],
): string {
  const corroborated = verifications.filter(
    ({ verification }) =>
      verification.corroborated,
  ).length;

  const conflicts = verifications.reduce(
    (total, { verification }) =>
      total + verification.conflictingSources,
    0,
  );

  return [
    `Verification status: ${status}.`,
    `Evidence items: ${verifications.length}.`,
    `Independent sources: ${sourceCount}.`,
    `Corroborated items: ${corroborated}.`,
    `Detected conflicts: ${conflicts}.`,
    warnings.length > 0
      ? `Warnings: ${warnings.join(", ")}.`
      : "No verification warnings.",
  ].join(" ");
}

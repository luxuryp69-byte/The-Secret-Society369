import type { KnowledgeItem } from "../types";

import type {
  ConflictDetectionResult,
  KnowledgeConflict,
  KnowledgeConflictType,
} from "./types";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);

    url.hash = "";

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, "");
  }
}

function sameTopic(
  left: KnowledgeItem,
  right: KnowledgeItem,
): boolean {
  return (
    normalizeText(left.topic) ===
    normalizeText(right.topic)
  );
}

function sameSource(
  left: KnowledgeItem,
  right: KnowledgeItem,
): boolean {
  const leftUrl = normalizeUrl(
    left.provenance?.sourceUrl ??
      left.source.url,
  );

  const rightUrl = normalizeUrl(
    right.provenance?.sourceUrl ??
      right.source.url,
  );

  return leftUrl === rightUrl;
}

function extractNumbers(value: string): number[] {
  const matches = value.match(
    /[-+]?(?:\d+(?:[.,]\d+)?|\d\*[.,]\d+)/g,
  );

  if (!matches) {
    return [];
  }

  return matches
    .map((match) =>
      Number(match.replace(",", ".")),
    )
    .filter((value) => Number.isFinite(value));
}

function hasExplicitNegation(value: string): boolean {
  return /\b(?:not|no|never|without|cannot|can't|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|hasn't|haven't|won't)\b/i.test(
    value,
  );
}

/**
 * Normalizes common English negative constructions so that:
 *
 * "supports" vs "does not support"
 * "is available" vs "is not available"
 * "works" vs "doesn't work"
 *
 * can be compared as the same underlying proposition.
 */
function normalizeNegatedClaim(value: string): string {
  let result = normalizeText(value);

  const replacements: Array<[RegExp, string]> = [
    [/\bdoes\s+not\s+support\b/g, "supports"],
    [/\bdo\s+not\s+support\b/g, "support"],
    [/\bdid\s+not\s+support\b/g, "supported"],
    [/\bdoesn't\s+support\b/g, "supports"],
    [/\bdon't\s+support\b/g, "support"],
    [/\bdidn't\s+support\b/g, "supported"],

    [/\bis\s+not\s+available\b/g, "is available"],
    [/\bisn't\s+available\b/g, "is available"],

    [/\bis\s+not\s+enabled\b/g, "is enabled"],
    [/\bisn't\s+enabled\b/g, "is enabled"],

    [/\bis\s+not\s+supported\b/g, "is supported"],
    [/\bisn't\s+supported\b/g, "is supported"],

    [/\bdoes\s+not\s+work\b/g, "works"],
    [/\bdoesn't\s+work\b/g, "works"],

    [/\bcan\s+not\b/g, "can"],
    [/\bcannot\b/g, "can"],
    [/\bcan't\b/g, "can"],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/\bnot\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}

function claimsAreEquivalent(
  left: string,
  right: string,
): boolean {
  const a = normalizeText(left);
  const b = normalizeText(right);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  return a.includes(b) || b.includes(a);
}

function detectExplicitNegation(
  leftClaim: string,
  rightClaim: string,
): boolean {
  const left = normalizeText(leftClaim);
  const right = normalizeText(rightClaim);

  if (!left || !right || left === right) {
    return false;
  }

  const leftNegated = hasExplicitNegation(left);
  const rightNegated = hasExplicitNegation(right);

  if (leftNegated === rightNegated) {
    return false;
  }

  const leftBase = normalizeNegatedClaim(left);
  const rightBase = normalizeNegatedClaim(right);

  if (!leftBase || !rightBase) {
    return false;
  }

  return (
    leftBase === rightBase ||
    leftBase.includes(rightBase) ||
    rightBase.includes(leftBase)
  );
}

function removeNumbers(value: string): string {
  return value
    .replace(
      /[-+]?(?:\d+(?:[.,]\d+)?|\d\*[.,]\d+)/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function detectNumericDisagreement(
  leftClaim: string,
  rightClaim: string,
): boolean {
  const left = normalizeText(leftClaim);
  const right = normalizeText(rightClaim);

  if (!left || !right) {
    return false;
  }

  const leftNumbers = extractNumbers(left);
  const rightNumbers = extractNumbers(right);

  if (
    leftNumbers.length === 0 ||
    rightNumbers.length === 0 ||
    leftNumbers.length !== rightNumbers.length
  ) {
    return false;
  }

  const leftStructure = removeNumbers(left);
  const rightStructure = removeNumbers(right);

  if (
    leftStructure !== rightStructure &&
    !leftStructure.includes(rightStructure) &&
    !rightStructure.includes(leftStructure)
  ) {
    return false;
  }

  return leftNumbers.some(
    (value, index) =>
      value !== rightNumbers[index],
  );
}

function detectOpposingClaim(
  leftClaim: string,
  rightClaim: string,
): boolean {
  const left = normalizeText(leftClaim);
  const right = normalizeText(rightClaim);

  if (!left || !right) {
    return false;
  }

  if (
    hasExplicitNegation(left) ||
    hasExplicitNegation(right)
  ) {
    return false;
  }

  if (claimsAreEquivalent(left, right)) {
    return false;
  }

  const opposingPairs: Array<
    [string, string]
  > = [
    ["increase", "decrease"],
    ["increases", "decreases"],
    ["increased", "decreased"],
    ["higher", "lower"],
    ["high", "low"],
    ["more", "less"],
    ["greater", "smaller"],
    ["grow", "shrink"],
    ["grows", "shrinks"],
    ["growth", "decline"],
    ["positive", "negative"],
    ["available", "unavailable"],
    ["enabled", "disabled"],
    ["active", "inactive"],
    ["open", "closed"],
    ["supported", "unsupported"],
    ["success", "failure"],
    ["true", "false"],
  ];

  for (const [first, second] of opposingPairs) {
    const leftFirst = left.includes(first);
    const leftSecond = left.includes(second);
    const rightFirst = right.includes(first);
    const rightSecond = right.includes(second);

    if (
      (leftFirst && rightSecond) ||
      (leftSecond && rightFirst)
    ) {
      const leftWithoutDirection = left
        .replaceAll(first, "")
        .replaceAll(second, "")
        .replace(/\s+/g, " ")
        .trim();

      const rightWithoutDirection = right
        .replaceAll(first, "")
        .replaceAll(second, "")
        .replace(/\s+/g, " ")
        .trim();

      if (
        leftWithoutDirection ===
          rightWithoutDirection ||
        leftWithoutDirection.includes(
          rightWithoutDirection,
        ) ||
        rightWithoutDirection.includes(
          leftWithoutDirection,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function detectPair(
  left: KnowledgeItem,
  right: KnowledgeItem,
): KnowledgeConflictType | null {
  if (!sameTopic(left, right)) {
    return null;
  }

  if (sameSource(left, right)) {
    return null;
  }

  const leftClaim = left.claim;
  const rightClaim = right.claim;

  if (
    claimsAreEquivalent(leftClaim, rightClaim)
  ) {
    return null;
  }

  if (
    detectExplicitNegation(
      leftClaim,
      rightClaim,
    )
  ) {
    return "EXPLICIT_NEGATION";
  }

  if (
    detectNumericDisagreement(
      leftClaim,
      rightClaim,
    )
  ) {
    return "NUMERIC_DISAGREEMENT";
  }

  if (
    detectOpposingClaim(
      leftClaim,
      rightClaim,
    )
  ) {
    return "OPPOSING_CLAIM";
  }

  return null;
}

function conflictReason(
  type: KnowledgeConflictType,
  left: KnowledgeItem,
  right: KnowledgeItem,
): string {
  switch (type) {
    case "EXPLICIT_NEGATION":
      return `Independent sources make mutually exclusive claims: one source asserts "${left.claim}" while another explicitly negates the same proposition with "${right.claim}".`;

    case "NUMERIC_DISAGREEMENT":
      return `Conflicting numeric values for the same topic: "${left.claim}" vs "${right.claim}".`;

    case "OPPOSING_CLAIM":
      return `Opposing claims detected for the same topic: "${left.claim}" vs "${right.claim}".`;
  }
}

export function detectConflicts(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
): ConflictDetectionResult {
  const conflicts: KnowledgeConflict[] = [];
  const conflictingItems: KnowledgeItem[] = [];

  for (const existing of existingItems) {
    if (existing.id === item.id) {
      continue;
    }

    const type = detectPair(
      item,
      existing,
    );

    if (!type) {
      continue;
    }

    conflicts.push({
      type,
      itemId: item.id,
      conflictingItemId: existing.id,
      topic: item.topic,
      reason: conflictReason(
        type,
        item,
        existing,
      ),
      sourceUrls: [
        item.provenance?.sourceUrl ??
          item.source.url,
        existing.provenance?.sourceUrl ??
          existing.source.url,
      ],
    });

    conflictingItems.push(existing);
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    conflictingItems,
  };
}

import type { KnowledgeItem } from "../types";

export interface CorroborationResult {
  corroborated: boolean;
  supportingSources: number;
  conflictingSources: number;
}

function normalizeClaim(claim: string): string {
  return claim
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function claimsMatch(left: string, right: string): boolean {
  const a = normalizeClaim(left);
  const b = normalizeClaim(right);

  if (!a || !b) return false;
  if (a === b) return true;

  return a.includes(b) || b.includes(a);
}

export function calculateCorroboration(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
): CorroborationResult {
  let supportingSources = 0;
  let conflictingSources = 0;

  for (const existing of existingItems) {
    if (existing.id === item.id) continue;
    if (existing.topic.toLowerCase() !== item.topic.toLowerCase()) continue;

    if (claimsMatch(existing.claim, item.claim)) {
      supportingSources += 1;
    }
  }

  return {
    corroborated: supportingSources > 0,
    supportingSources,
    conflictingSources,
  };
}

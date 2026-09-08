import type { KnowledgeSourceType } from "../types";

const AUTHORITY_SCORE: Record<KnowledgeSourceType, number> = {
  government: 100,
  academic: 95,
  research: 95,
  official: 90,
  company: 80,
  news: 70,
  community: 45,
  other: 25,
};

export function getSourceAuthority(type: KnowledgeSourceType): number {
  return AUTHORITY_SCORE[type] ?? AUTHORITY_SCORE.other;
}

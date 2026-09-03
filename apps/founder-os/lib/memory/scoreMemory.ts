import type { FounderMemory } from "./types";

export interface MemoryScore {
  section: string;
  score: number;
}

export function scoreMemory(
  memory: FounderMemory
): MemoryScore[] {

  const scores: MemoryScore[] = [];

  if (memory.company.name) {
    scores.push({
      section: "company",
      score: 100,
    });
  }

  if (memory.product.name) {
    scores.push({
      section: "product",
      score: 95,
    });
  }

  if (memory.product.description) {
    scores.push({
      section: "productDescription",
      score: 90,
    });
  }

  if (memory.goals.length) {
    scores.push({
      section: "goals",
      score: 85,
    });
  }

  if (memory.insights.length) {
    scores.push({
      section: "insights",
      score: 80,
    });
  }

  if (memory.knowledge.length) {
    scores.push({
      section: "knowledge",
      score: 70,
    });
  }

  return scores.sort(
    (a, b) => b.score - a.score
  );
}

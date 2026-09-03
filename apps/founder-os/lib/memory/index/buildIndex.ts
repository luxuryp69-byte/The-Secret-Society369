import type { FounderMemory } from "../types";

export interface MemoryIndex {

  founder: string[];

  company: string[];

  product: string[];

  goals: string[];

  knowledge: string[];

  insights: string[];

  decisions: string[];

}

export function buildMemoryIndex(
  memory: FounderMemory
): MemoryIndex {

  return {

    founder: Object.values(
      memory.founder
    ).filter(Boolean),

    company: Object.values(
      memory.company
    ).filter(Boolean),

    product: Object.values(
      memory.product
    ).filter(Boolean),

    goals:
      memory.goals.map(
        g => g.text
      ),

    knowledge:
      [...memory.knowledge],

    insights:
      [...memory.insights],

    decisions:
      memory.decisions.map(
        d => d.decision
      ),

  };

}

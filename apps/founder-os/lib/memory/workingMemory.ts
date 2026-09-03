import type {
  FounderMemory,
} from "./types";

export function buildWorkingMemory(
  memory: FounderMemory
): FounderMemory {

  return {

    founder: memory.founder,

    company: memory.company,

    product: memory.product,

    goals:
      memory.goals
        .filter(g => !g.completed)
        .slice(0, 10),

    decisions:
      memory.decisions
        .slice(-20),

    knowledge:
      memory.knowledge
        .slice(0, 30),

    conversations:
      memory.conversations
        .slice(-20),

    insights:
      memory.insights
        .slice(-20),

  };

}

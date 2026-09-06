import { loadMemory } from "./store";
import { selectRelevantMemory } from "./selectRelevantMemory";

export async function buildMemoryContext() {
  const fullMemory = await loadMemory();
  const memory = selectRelevantMemory(fullMemory);
  const conversation = fullMemory.conversations.slice(-12);

  return {
    memory,
    conversation,
    company: memory.company,
    founder: memory.founder,
    product: memory.product,
    goals: memory.goals,
    knowledge: memory.knowledge,
  };
}

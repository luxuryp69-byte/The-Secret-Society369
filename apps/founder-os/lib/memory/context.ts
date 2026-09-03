import { loadMemory } from "./store";
import { recentConversation } from "./conversation";
import { selectRelevantMemory } from "./selectRelevantMemory";

export async function buildMemoryContext() {

  const fullMemory =
    await loadMemory();

  const memory =
    selectRelevantMemory(fullMemory);

  const conversation =
    await recentConversation();

  return {

    memory,

    conversation,

    company:
      memory.company,

    founder:
      memory.founder,

    product:
      memory.product,

    goals:
      memory.goals,

    knowledge:
      memory.knowledge,

  };

}

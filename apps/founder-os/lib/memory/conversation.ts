import { loadMemory, saveMemory } from "./store";

export async function addConversation(
  role: "user" | "assistant",
  content: string
) {
  const memory = await loadMemory();

  memory.conversations.push(
    `[${role}] ${content}`
  );

  if (memory.conversations.length > 100) {
    memory.conversations =
      memory.conversations.slice(-100);
  }

  await saveMemory(memory);
}

export async function recentConversation(
  limit = 12
) {
  const memory = await loadMemory();

  return memory.conversations.slice(-limit);
}

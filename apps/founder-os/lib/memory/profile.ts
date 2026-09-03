import { loadMemory, saveMemory } from "./store";

export async function updateProfile(
  text: string
) {
  const lower = text.toLowerCase();

  const memory = await loadMemory();

  if (lower.includes("my company is")) {
    memory.company.name =
      text.split(/my company is/i)[1]?.trim() ?? "";
  }

  if (lower.includes("i am building")) {
    memory.product.description =
      text.split(/i am building/i)[1]?.trim() ?? "";
  }

  if (lower.includes("my goal is")) {
    // TODO:
    // Goals will be migrated to the new Planner.
    // For now we simply ignore goal extraction.
  }

  await saveMemory(memory);
}

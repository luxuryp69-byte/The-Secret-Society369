import { loadMemory, saveMemory } from "./store";
import { consolidateMemory } from "./consolidation/consolidate";

import type { FounderMemory } from "./types";

export async function getMemory(): Promise<FounderMemory> {
  return loadMemory();
}

export async function updateMemory(
  updater: (
    memory: FounderMemory
  ) => void | Promise<void>
) {

  const memory =
    await loadMemory();

  await updater(memory);

  const consolidated =
    await consolidateMemory(memory);

  await saveMemory(consolidated);

}

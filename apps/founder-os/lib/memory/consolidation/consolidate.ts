import type {
  FounderMemory,
  Goal,
} from "../types";

import { reasonGoals } from "../reasoning/reasonGoals";

function normalize(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function consolidateMemory(
  memory: FounderMemory
): Promise<FounderMemory> {

  const uniqueGoals = new Map<
    string,
    Goal
  >();

  for (const goal of memory.goals) {

    const key =
      normalize(goal.text);

    if (!uniqueGoals.has(key)) {
      uniqueGoals.set(key, goal);
    }

  }

  memory.goals =
    await reasonGoals(
      [...uniqueGoals.values()]
    );

  return memory;

}

import type { FounderMemory } from "./types";

import { buildMemoryIndex } from "./index/buildIndex";

import { scoreMemory } from "./scoreMemory";
import { rankMemory } from "./rankMemory";
import { buildWorkingMemory } from "./workingMemory";

export function selectRelevantMemory(
  memory: FounderMemory
): FounderMemory {

  const index =
    buildMemoryIndex(memory);

  console.log(
    "\n🗂 Memory Index"
  );

  console.table(index);

  const scores =
    scoreMemory(memory);

  const ranking =
    rankMemory(scores);

  console.log(
    "\n📊 Memory Ranking"
  );

  console.table(ranking);

  return buildWorkingMemory(memory);

}

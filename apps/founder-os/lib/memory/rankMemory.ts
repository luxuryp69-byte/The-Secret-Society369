import type { MemoryScore } from "./scoreMemory";

export function rankMemory(
  scores: MemoryScore[]
): MemoryScore[] {

  return [...scores].sort(
    (a, b) => b.score - a.score
  );

}

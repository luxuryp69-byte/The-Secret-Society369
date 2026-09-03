import type { FounderMemory } from "../types";

import {
  searchKernelMemory,
} from "../kernelBridge";

import { buildWorkingMemory } from "../workingMemory";

function recordToString(
  record: {
    type: string;
    content?: unknown;
  },
): string | null {
  if (record.type !== "knowledge") {
    return null;
  }

  if (typeof record.content === "string") {
    return record.content;
  }

  if (record.content === null || record.content === undefined) {
    return null;
  }

  return JSON.stringify(record.content);
}

export async function buildExecutiveContext(
  query: string,
  memory: FounderMemory,
): Promise<FounderMemory> {
  const working = buildWorkingMemory(memory);

  const records = await searchKernelMemory(
    query,
    20,
  );

  const kernelKnowledge = records
    .map(recordToString)
    .filter(
      (value): value is string =>
        value !== null,
    );

  return {
    ...working,

    knowledge:
      kernelKnowledge.length > 0
        ? kernelKnowledge
        : working.knowledge.slice(0, 20),
  };
}
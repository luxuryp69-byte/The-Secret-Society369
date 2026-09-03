import { askJSON } from "@/lib/ai/ollama";

import type { Goal } from "../types";

export async function reasonGoals(
  goals: Goal[]
): Promise<Goal[]> {

  if (goals.length <= 1) {
    return goals;
  }

  const prompt = `
You are the executive memory system of FounderOS.

Your job is NOT to invent goals.

Your ONLY job is to identify duplicated or extremely similar goals.

Return ONLY valid JSON.

Example:

[
  {
    "id":"1",
    "text":"Raise Seed Round",
    "completed":false
  }
]

Goals:

${JSON.stringify(goals, null, 2)}
`;

  try {

    const raw =
      await askJSON(prompt);

    const parsed =
      JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }

  } catch (err) {

    console.log(
      "Executive Reasoner fallback."
    );

  }

  return goals;

}

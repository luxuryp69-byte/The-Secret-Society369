import { askJSON } from "@/lib/ai/ollama";

import { EXTRACTION_PROMPT } from "./prompt";
import { extractJson } from "./json";

import {
  ExtractedMemory,
  ExtractedMemorySchema,
} from "./schema";

export async function extract(
  message: string
): Promise<ExtractedMemory> {

  const prompt = `
${EXTRACTION_PROMPT}

Founder message:

${message}
`;

  const raw = await askJSON(
  prompt,
  {
    temperature: 0.1,
    num_predict: 256,
  },
);

  try {
    const json = extractJson(raw);
    const parsed = JSON.parse(json);

    return ExtractedMemorySchema.parse(parsed);

  } catch (err) {
    console.error("❌ Extraction failed");
    console.error(err);

    return ExtractedMemorySchema.parse({});
  }
}

import { askText } from "./ollama";

export async function chat(
  prompt: string
) {
  return askText(prompt);
}
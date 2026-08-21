export function extractJson(text: string): string {
  let cleaned = text.trim();

  // Elimina bloques Markdown ```json ... ```
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/```$/i, "");

  // Busca el primer objeto JSON
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found.");
  }

  return cleaned.slice(start, end + 1);
}
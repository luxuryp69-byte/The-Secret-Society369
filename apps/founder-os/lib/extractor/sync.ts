import type {
  ExtractedMemory,
} from "./schema";

import {
  loadMemory,
  saveMemory,
} from "@/lib/memory/store";

function normalizeText(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function mergeDescriptions(
  current: string,
  incoming: string,
): string {
  const splitIntoSentences = (
    value: string,
  ): string[] =>
    normalizeText(value)
      .split(/[.!?]+/)
      .map((part) => normalizeText(part))
      .filter(Boolean);

  const existingParts =
    splitIntoSentences(current);

  const incomingParts =
    splitIntoSentences(incoming);

  const merged = [
    ...existingParts,
  ];

  for (
    const incomingPart
    of incomingParts
  ) {
    const normalizedIncoming =
      incomingPart.toLowerCase();

    const alreadyExists =
      merged.some((existingPart) => {
        const normalizedExisting =
          existingPart.toLowerCase();

        return (
          normalizedExisting ===
            normalizedIncoming ||
          normalizedExisting.includes(
            normalizedIncoming,
          ) ||
          normalizedIncoming.includes(
            normalizedExisting,
          )
        );
      });

    if (!alreadyExists) {
      merged.push(incomingPart);
    }
  }

  return merged.join(". ");
}

function assignNonEmpty(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
) {
  for (
    const [key, value]
    of Object.entries(source)
  ) {
    if (
      typeof value !== "string"
    ) {
      continue;
    }

    const normalized =
      normalizeText(value);

    if (!normalized) {
      continue;
    }

    if (
      key === "description"
    ) {
      const current =
        typeof target[key] === "string"
          ? target[key]
          : "";

      target[key] =
        mergeDescriptions(
          current,
          normalized,
        );

      continue;
    }

    target[key] = normalized;
  }
}

export async function syncMemory(
  extracted: ExtractedMemory,
) {
  const memory =
    await loadMemory();

  assignNonEmpty(
    memory.company as Record<
      string,
      unknown
    >,
    extracted.company as Record<
      string,
      unknown
    >,
  );

  assignNonEmpty(
    memory.founder as Record<
      string,
      unknown
    >,
    extracted.founder as Record<
      string,
      unknown
    >,
  );

  if (
    extracted.clearProductName
  ) {
    delete (
      memory.product as Record<
        string,
        unknown
      >
    ).name;

    console.log(
      "🧹 Product name cleared | extraction identified it as a description",
    );
  }

  assignNonEmpty(
    memory.product as Record<
      string,
      unknown
    >,
    extracted.product as Record<
      string,
      unknown
    >,
  );

  await saveMemory(memory);

  console.log(
    "💾 Profile Updated",
  );
}

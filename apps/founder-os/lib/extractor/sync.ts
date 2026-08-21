import type {
  ExtractedMemory,
} from "./schema";

import {
  loadMemory,
  saveMemory,
} from "@/lib/memory/store";

function mergeDescriptions(
  current: string,
  incoming: string,
): string {
  const normalizedCurrent =
    current
      .trim()
      .replace(/\s+/g, " ");

  const normalizedIncoming =
    incoming
      .trim()
      .replace(/\s+/g, " ");

  if (!normalizedCurrent) {
    return normalizedIncoming;
  }

  if (!normalizedIncoming) {
    return normalizedCurrent;
  }

  const lowerCurrent =
    normalizedCurrent.toLowerCase();

  const lowerIncoming =
    normalizedIncoming.toLowerCase();

  if (
    lowerCurrent === lowerIncoming ||
    lowerCurrent.includes(lowerIncoming)
  ) {
    return normalizedCurrent;
  }

  for (
    const currentPart
    of normalizedCurrent.match(
      /[^.!?]+[.!?]?/g,
    ) ?? [normalizedCurrent]
  ) {
    const normalizedPart =
      currentPart
        .trim()
        .toLowerCase()
        .replace(/[.!?]+$/, "");

    if (
      normalizedPart &&
      lowerIncoming === normalizedPart
    ) {
      return normalizedCurrent;
    }
  }

  if (
    lowerIncoming.includes(lowerCurrent)
  ) {
    return normalizedIncoming;
  }

  const merged =
    (
      normalizedCurrent.match(
        /[^.!?]+[.!?]?/g,
      ) ?? [normalizedCurrent]
    )
      .map((part) => part.trim())
      .filter(Boolean);

  const incomingParts =
    (
      normalizedIncoming.match(
        /[^.!?]+[.!?]?/g,
      ) ?? [normalizedIncoming]
    )
      .map((part) => part.trim())
      .filter(Boolean);

  for (
    const incomingPart
    of incomingParts
  ) {
    const normalizedIncomingPart =
      incomingPart
        .toLowerCase()
        .replace(/[.!?]+$/, "");

    const alreadyExists =
      merged.some((existingPart) => {
        const normalizedExisting =
          existingPart
            .toLowerCase()
            .replace(/[.!?]+$/, "");

        return (
          normalizedExisting ===
            normalizedIncomingPart ||
          (
            normalizedIncomingPart.length > 8 &&
            normalizedExisting.includes(
              normalizedIncomingPart,
            )
          ) ||
          (
            normalizedExisting.length > 8 &&
            normalizedIncomingPart.includes(
              normalizedExisting,
            )
          )
        );
      });

    if (!alreadyExists) {
      merged.push(incomingPart);
    }
  }

  return merged.reduce(
    (description, part) => {
      if (!description) {
        return part;
      }

      const separator =
        /[.!?]$/.test(description)
          ? " "
          : ". ";

      return `${description}${separator}${part}`;
    },
    "",
  );
}

export async function syncMemory(
  extracted: ExtractedMemory,
) {
  const memory =
    await loadMemory();

  const profileSections: Array<
    [
      Record<string, unknown>,
      Record<string, unknown>,
    ]
  > = [
    [
      memory.company as Record<
        string,
        unknown
      >,
      extracted.company as Record<
        string,
        unknown
      >,
    ],
    [
      memory.founder as Record<
        string,
        unknown
      >,
      extracted.founder as Record<
        string,
        unknown
      >,
    ],
  ];

  for (
    const [target, source]
    of profileSections
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
        value
          .trim()
          .replace(/\s+/g, " ");

      if (!normalized) {
        continue;
      }

      target[key] = normalized;
    }
  }

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

  const product =
    memory.product as Record<
      string,
      unknown
    >;

  for (
    const [key, value]
    of Object.entries(
      extracted.product as Record<
        string,
        unknown
      >,
    )
  ) {
    if (
      typeof value !== "string"
    ) {
      continue;
    }

    const normalized =
      value
        .trim()
        .replace(/\s+/g, " ");

    if (!normalized) {
      continue;
    }

    if (
      key === "name" &&
      extracted.clearProductName
    ) {
      continue;
    }

    if (
      key === "description"
    ) {
      product[key] =
        mergeDescriptions(
          typeof product[key] === "string"
            ? product[key]
            : "",
          normalized,
        );

      continue;
    }

    product[key] = normalized;
  }

  await saveMemory(memory);

  console.log(
    "💾 Profile Updated",
  );
}

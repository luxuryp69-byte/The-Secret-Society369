import type {
  TraceMemory,
  TraceMemoryReference,
} from "./types";

type MemoryCategory =
  | "founder"
  | "company"
  | "product"
  | "goals"
  | "decisions"
  | "knowledge"
  | "conversations"
  | "insights";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasArray(
  value: UnknownRecord,
  key: string,
): boolean {
  return Array.isArray(value[key]);
}

function copyStringIds(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return typeof item.id === "string"
      ? [item.id]
      : [];
  });
}

function addCategory(
  categories: MemoryCategory[],
  memory: UnknownRecord,
  category: MemoryCategory,
): void {
  const value = memory[category];

  if (
    isRecord(value) ||
    hasArray(memory, category)
  ) {
    categories.push(category);
  }
}

function projectReference(
  category: MemoryCategory,
  reference?: string,
): TraceMemoryReference {
  return {
    category,
    ...(reference !== undefined
      ? { reference }
      : {}),
    relation: "AVAILABLE_CONTEXT",
    provenance: {
      source: "FOUNDER_MEMORY",
      kind: "CONTEXT",
    },
  };
}

export function projectTraceMemory(
  memory: unknown,
): TraceMemory {
  if (!isRecord(memory)) {
    return {
      available: false,
      categories: [],
      references: [],
      provenance: {
        source: "FOUNDER_MEMORY",
        kind: "CONTEXT",
      },
    };
  }

  const categories: MemoryCategory[] = [];

  for (const category of [
    "founder",
    "company",
    "product",
    "goals",
    "decisions",
    "knowledge",
    "conversations",
    "insights",
  ] as const) {
    addCategory(
      categories,
      memory,
      category,
    );
  }

  const references: TraceMemoryReference[] =
    [];

  for (const id of copyStringIds(memory.goals)) {
    references.push(
      projectReference(
        "goals",
        id,
      ),
    );
  }

  for (const id of copyStringIds(memory.decisions)) {
    references.push(
      projectReference(
        "decisions",
        id,
      ),
    );
  }

  return {
    available: true,
    categories: [...categories],
    references,
    provenance: {
      source: "FOUNDER_MEMORY",
      kind: "CONTEXT",
    },
  };
}

import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import type {
  KnowledgeConflict,
  KnowledgeConflictStatus,
} from "./types";

const DEFAULT_FILE = path.join(
  process.cwd(),
  "data",
  "knowledge-conflicts.json",
);

async function readConflicts(
  filePath: string,
): Promise<KnowledgeConflict[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Knowledge conflict storage must contain an array.",
      );
    }

    return parsed as KnowledgeConflict[];
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? error.code
        : undefined;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeConflicts(
  filePath: string,
  conflicts: KnowledgeConflict[],
): Promise<void> {
  await mkdir(path.dirname(filePath), {
    recursive: true,
  });

  await writeFile(
    filePath,
    `${JSON.stringify(conflicts, null, 2)}\n`,
    "utf8",
  );
}

function buildConflictKey(
  conflict: Pick<
    KnowledgeConflict,
    "type" | "itemId" | "conflictingItemId"
  >,
): string {
  const itemIds = [
    conflict.itemId,
    conflict.conflictingItemId,
  ].sort();

  return [
    conflict.type,
    itemIds[0],
    itemIds[1],
  ].join("::");
}

export class LocalKnowledgeConflictRepository {
  constructor(
    private readonly filePath = DEFAULT_FILE,
  ) {}

  async list(): Promise<KnowledgeConflict[]> {
    return readConflicts(this.filePath);
  }

  async get(
    id: string,
  ): Promise<KnowledgeConflict | null> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    return (
      conflicts.find(
        (conflict) => conflict.id === id,
      ) ?? null
    );
  }

  async findByPair(
    itemId: string,
    conflictingItemId: string,
    type: KnowledgeConflict["type"],
  ): Promise<KnowledgeConflict | null> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    const key = buildConflictKey({
      type,
      itemId,
      conflictingItemId,
    });

    return (
      conflicts.find(
        (conflict) =>
          buildConflictKey(conflict) === key,
      ) ?? null
    );
  }

  async listActive(): Promise<KnowledgeConflict[]> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    return conflicts.filter(
      (conflict) =>
        conflict.status === "OPEN" ||
        conflict.status === "REVIEWING",
    );
  }

  async listByItem(
    itemId: string,
  ): Promise<KnowledgeConflict[]> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    return conflicts.filter(
      (conflict) =>
        conflict.itemId === itemId ||
        conflict.conflictingItemId === itemId,
    );
  }

  async save(
    conflict: KnowledgeConflict,
  ): Promise<KnowledgeConflict> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    const existingIndex = conflicts.findIndex(
      (existing) =>
        existing.id === conflict.id,
    );

    if (existingIndex === -1) {
      conflicts.push(conflict);
    } else {
      conflicts[existingIndex] = conflict;
    }

    await writeConflicts(
      this.filePath,
      conflicts,
    );

    return conflict;
  }

  async upsert(
    conflict: KnowledgeConflict,
  ): Promise<KnowledgeConflict> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    const key = buildConflictKey(conflict);

    const existingIndex = conflicts.findIndex(
      (existing) =>
        buildConflictKey(existing) === key,
    );

    if (existingIndex === -1) {
      conflicts.push(conflict);

      await writeConflicts(
        this.filePath,
        conflicts,
      );

      return conflict;
    }

    const existing = conflicts[existingIndex];

    const merged: KnowledgeConflict = {
      ...existing,
      ...conflict,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: conflict.updatedAt,
      resolution:
        conflict.resolution ??
        existing.resolution,
    };

    /*
     * RESOLVED/DISMISSED are historical states.
     * A repeated identical detection must not silently
     * erase the human review decision.
     */
    if (
      existing.status === "RESOLVED" ||
      existing.status === "DISMISSED"
    ) {
      merged.status = existing.status;
      merged.resolution = existing.resolution;
    }

    conflicts[existingIndex] = merged;

    await writeConflicts(
      this.filePath,
      conflicts,
    );

    return merged;
  }

  async updateStatus(
    id: string,
    status: KnowledgeConflictStatus,
  ): Promise<KnowledgeConflict | null> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    const index = conflicts.findIndex(
      (conflict) => conflict.id === id,
    );

    if (index === -1) {
      return null;
    }

    const existing = conflicts[index];

    const updated: KnowledgeConflict = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    conflicts[index] = updated;

    await writeConflicts(
      this.filePath,
      conflicts,
    );

    return updated;
  }

  async delete(
    id: string,
  ): Promise<void> {
    const conflicts = await readConflicts(
      this.filePath,
    );

    const filtered = conflicts.filter(
      (conflict) => conflict.id !== id,
    );

    if (filtered.length !== conflicts.length) {
      await writeConflicts(
        this.filePath,
        filtered,
      );
    }
  }
}

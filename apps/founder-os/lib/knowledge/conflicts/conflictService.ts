import type { KnowledgeItem } from "../types";
import { detectConflicts } from "./detectConflict";
import {
  LocalKnowledgeConflictRepository,
} from "./conflictRepository";
import type {
  KnowledgeConflict,
  KnowledgeConflictResolution,
} from "./types";

export interface ConflictServiceOptions {
  repository?: LocalKnowledgeConflictRepository;
  now?: Date;
}

function createConflictId(
  conflict: KnowledgeConflict,
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

export async function persistDetectedConflicts(
  item: KnowledgeItem,
  existingItems: KnowledgeItem[],
  options: ConflictServiceOptions = {},
): Promise<KnowledgeConflict[]> {
  const repository =
    options.repository ??
    new LocalKnowledgeConflictRepository();

  const detection = detectConflicts(
    item,
    existingItems,
  );

  const persisted: KnowledgeConflict[] = [];

  for (const detected of detection.conflicts) {
    const now = (
      options.now ?? new Date()
    ).toISOString();

    const conflict: KnowledgeConflict = {
      ...detected,
      id: createConflictId(detected),
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    };

    const stored = await repository.upsert(
      conflict,
    );

    persisted.push(stored);
  }

  return persisted;
}

export async function getActiveConflicts(
  repository = new LocalKnowledgeConflictRepository(),
): Promise<KnowledgeConflict[]> {
  return repository.listActive();
}

export async function getConflictsForItem(
  itemId: string,
  repository = new LocalKnowledgeConflictRepository(),
): Promise<KnowledgeConflict[]> {
  return repository.listByItem(itemId);
}

export async function startConflictReview(
  id: string,
  repository = new LocalKnowledgeConflictRepository(),
): Promise<KnowledgeConflict | null> {
  const conflict = await repository.get(id);

  if (!conflict) {
    return null;
  }

  if (
    conflict.status === "RESOLVED" ||
    conflict.status === "DISMISSED"
  ) {
    throw new Error(
      "Historical conflicts cannot return to review.",
    );
  }

  return repository.updateStatus(
    id,
    "REVIEWING",
  );
}

export async function resolveConflict(
  id: string,
  resolution: Omit<
    KnowledgeConflictResolution,
    "status"
  >,
  repository = new LocalKnowledgeConflictRepository(),
): Promise<KnowledgeConflict | null> {
  const conflict = await repository.get(id);

  if (!conflict) {
    return null;
  }

  if (
    conflict.status === "RESOLVED" ||
    conflict.status === "DISMISSED"
  ) {
    throw new Error(
      "The conflict has already been closed.",
    );
  }

  const resolvedAt = resolution.resolvedAt;

  const updated: KnowledgeConflict = {
    ...conflict,
    status: "RESOLVED",
    updatedAt: resolvedAt,
    resolution: {
      status: "RESOLVED",
      ...resolution,
    },
  };

  return repository.save(updated);
}

export async function dismissConflict(
  id: string,
  resolution: Omit<
    KnowledgeConflictResolution,
    "status"
  >,
  repository = new LocalKnowledgeConflictRepository(),
): Promise<KnowledgeConflict | null> {
  const conflict = await repository.get(id);

  if (!conflict) {
    return null;
  }

  if (
    conflict.status === "RESOLVED" ||
    conflict.status === "DISMISSED"
  ) {
    throw new Error(
      "The conflict has already been closed.",
    );
  }

  const dismissedAt = resolution.resolvedAt;

  const updated: KnowledgeConflict = {
    ...conflict,
    status: "DISMISSED",
    updatedAt: dismissedAt,
    resolution: {
      status: "DISMISSED",
      ...resolution,
    },
  };

  return repository.save(updated);
}

export async function hasActiveConflict(
  itemId: string,
  repository = new LocalKnowledgeConflictRepository(),
): Promise<boolean> {
  const conflicts =
    await repository.listByItem(itemId);

  return conflicts.some(
    (conflict) =>
      conflict.status === "OPEN" ||
      conflict.status === "REVIEWING",
  );
}

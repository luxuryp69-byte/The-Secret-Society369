import type { KnowledgeItem } from "../types";

export type KnowledgeConflictType =
  | "EXPLICIT_NEGATION"
  | "NUMERIC_DISAGREEMENT"
  | "OPPOSING_CLAIM";

export interface KnowledgeConflict {
  type: KnowledgeConflictType;
  itemId: string;
  conflictingItemId: string;
  topic: string;
  reason: string;
  sourceUrls: string[];
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflicts: KnowledgeConflict[];
  conflictingItems: KnowledgeItem[];
}

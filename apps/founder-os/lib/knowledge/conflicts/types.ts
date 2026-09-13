import type { KnowledgeItem } from "../types";

export type KnowledgeConflictType =
  | "EXPLICIT_NEGATION"
  | "NUMERIC_DISAGREEMENT"
  | "OPPOSING_CLAIM";

export type KnowledgeConflictStatus =
  | "OPEN"
  | "REVIEWING"
  | "RESOLVED"
  | "DISMISSED";

export interface KnowledgeConflictResolution {
  status: "RESOLVED" | "DISMISSED";
  resolvedBy: string;
  resolvedAt: string;
  explanation: string;
  evidence: string[];
}

export interface KnowledgeConflict {
  type: KnowledgeConflictType;
  itemId: string;
  conflictingItemId: string;
  topic: string;
  reason: string;
  sourceUrls: string[];
  id?: string;
  status?: KnowledgeConflictStatus;
  createdAt?: string;
  updatedAt?: string;
  resolution?: KnowledgeConflictResolution;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflicts: KnowledgeConflict[];
  conflictingItems: KnowledgeItem[];
}

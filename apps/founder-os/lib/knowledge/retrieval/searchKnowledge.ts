import type { KnowledgeItem } from "../types";
import { calculateVerificationStatus } from "../verification/status";

export interface KnowledgeSearchOptions {
  topic?: string;
  geography?: string;
  tags?: string[];
  verifiedOnly?: boolean;
  limit?: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matches(
  item: KnowledgeItem,
  options: KnowledgeSearchOptions,
): boolean {
  const topic =
    options.topic && normalize(options.topic);

  if (
    topic &&
    !normalize(item.topic).includes(topic) &&
    !normalize(item.claim).includes(topic)
  ) {
    return false;
  }

  const geography =
    options.geography && normalize(options.geography);

  if (
    geography &&
    !normalize(item.geography ?? "").includes(geography)
  ) {
    return false;
  }

  if (options.tags?.length) {
    const itemTags = item.tags.map(normalize);

    const hasRequestedTag = options.tags.some((tag) =>
      itemTags.includes(normalize(tag)),
    );

    if (!hasRequestedTag) {
      return false;
    }
  }

  if (options.verifiedOnly) {
    const status = calculateVerificationStatus(item);

    if (status !== "VERIFIED") {
      return false;
    }
  }

  return true;
}

function score(item: KnowledgeItem): number {
  const status = calculateVerificationStatus(item);

  const verificationScore =
    status === "VERIFIED"
      ? 100
      : status === "UNVERIFIED"
        ? 25
        : 0;

  return verificationScore + item.confidence;
}

export function searchKnowledge(
  items: KnowledgeItem[],
  options: KnowledgeSearchOptions = {},
): KnowledgeItem[] {
  const limit = Math.max(1, options.limit ?? 20);

  return items
    .filter((item) => matches(item, options))
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

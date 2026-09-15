import type { KnowledgeItem } from "../types";
import { createKnowledgeRepository } from "../store";
import { buildTrustedAnswer } from "../answers/trustedAnswerBuilder";
import { verifyKnowledgeItem } from "../verification/verificationOrchestrator";
import type {
  KnowledgeQueryOptions,
  KnowledgeQueryResult,
} from "./types";

const DEFAULT_LIMIT = 5;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function scoreItem(
  query: string,
  item: KnowledgeItem,
  options: KnowledgeQueryOptions,
): number {
  const queryTokens = new Set(tokenize(query));

  if (queryTokens.size === 0) {
    return 0;
  }

  const claimTokens = new Set(tokenize(item.claim));
  const topicTokens = new Set(tokenize(item.topic));
  const tagTokens = new Set(
    item.tags.flatMap((tag) => tokenize(tag)),
  );

  let score = 0;

  for (const token of queryTokens) {
    if (claimTokens.has(token)) {
      score += 5;
    }

    if (topicTokens.has(token)) {
      score += 3;
    }

    if (tagTokens.has(token)) {
      score += 2;
    }
  }

  if (
    options.topic &&
    normalize(item.topic) === normalize(options.topic)
  ) {
    score += 10;
  }

  if (
    options.geography &&
    item.geography &&
    normalize(item.geography) === normalize(options.geography)
  ) {
    score += 8;
  }

  if (options.tags?.length) {
    const itemTags = new Set(
      item.tags.map((tag) => normalize(tag)),
    );

    for (const tag of options.tags) {
      if (itemTags.has(normalize(tag))) {
        score += 4;
      }
    }
  }

  if (
    score > 0 &&
    item.verificationStatus === "VERIFIED"
  ) {
    score += 2;
  }

  return score;
}

function matchesVerifiedOnly(
  item: KnowledgeItem,
  options: KnowledgeQueryOptions,
): boolean {
  return !options.verifiedOnly ||
    item.verificationStatus === "VERIFIED";
}

function selectItems(
  query: string,
  items: KnowledgeItem[],
  options: KnowledgeQueryOptions,
): KnowledgeItem[] {
  const scored = items
    .filter((item) => matchesVerifiedOnly(item, options))
    .map((item) => ({
      item,
      score: scoreItem(query, item, options),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.item.confidence !== a.item.confidence) {
        return b.item.confidence - a.item.confidence;
      }

      return b.item.updatedAt.localeCompare(
        a.item.updatedAt,
      );
    });

  const limit = Math.max(
    1,
    options.limit ?? DEFAULT_LIMIT,
  );

  return scored
    .slice(0, limit)
    .map((entry) => entry.item);
}

export class KnowledgeQueryService {
  constructor(
    private readonly repository = createKnowledgeRepository(),
  ) {}

  async query(
    query: string,
    options: KnowledgeQueryOptions = {},
  ): Promise<KnowledgeQueryResult> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return {
        query: normalizedQuery,
        matchedItems: 0,
        trustedAnswer: null,
        status: "NO_MATCH",
      };
    }

    const allItems = await this.repository.list();

    const candidates = selectItems(
      normalizedQuery,
      allItems,
      options,
    );

    if (candidates.length === 0) {
      return {
        query: normalizedQuery,
        matchedItems: 0,
        trustedAnswer: null,
        status: "NO_MATCH",
      };
    }

    const primaryItem = candidates[0];

    const verification = await verifyKnowledgeItem(
      primaryItem,
      allItems.filter(
        (item) => item.id !== primaryItem.id,
      ),
    );

    const trustedAnswer = buildTrustedAnswer({
      answer: primaryItem.claim,
      item: primaryItem,
      verification,
    });

    return {
      query: normalizedQuery,
      matchedItems: candidates.length,
      trustedAnswer,
      status: trustedAnswer.status,
    };
  }
}

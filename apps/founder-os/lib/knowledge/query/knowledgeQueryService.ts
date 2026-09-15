import type { KnowledgeItem } from "../types";
import { createKnowledgeRepository } from "../store";
import {
  buildAggregatedTrustedAnswer,
} from "../answers/trustedAnswerBuilder";
import { verifyKnowledgeItem } from "../verification/verificationOrchestrator";
import type {
  KnowledgeQueryCandidate,
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

function normalizeTopic(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "if",
  "in",
  "is",
  "it",
  "la",
  "las",
  "los",
  "of",
  "on",
  "or",
  "our",
  "should",
  "that",
  "the",
  "their",
  "this",
  "to",
  "we",
  "what",
  "when",
  "which",
  "with",
  "would",
  "you",
  "your",
  "founder",
  "founders",
  "os",
]);

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));
}


function scoreItem(
  query: string,
  item: KnowledgeItem,
  options: KnowledgeQueryOptions,
): number {
  const queryTokens = new Set(tokenize(query));

  const exactTopicFilter =
    Boolean(options.topic) &&
    normalizeTopic(item.topic) ===
      normalizeTopic(options.topic ?? "");

  const exactGeographyFilter =
    Boolean(options.geography) &&
    Boolean(item.geography) &&
    normalizeTopic(item.geography ?? "") ===
      normalizeTopic(options.geography ?? "");

  /*
   * Explicit structured filters must remain usable even
   * when the textual query contains only stopwords.
   *
   * Example:
   *   query = "Founder OS"
   *   topic = "founder-os"
   *
   * "founder" and "os" are intentionally stopwords for
   * broad lexical retrieval, but the explicit topic filter
   * is still a valid retrieval signal.
   */
  if (
    queryTokens.size === 0 &&
    !exactTopicFilter &&
    !exactGeographyFilter &&
    !options.tags?.length
  ) {
    return 0;
  }

  const claimTokens = new Set(
    tokenize(item.claim),
  );

  const topicTokens = new Set(
    tokenize(item.topic),
  );

  const tagTokens = new Set(
    item.tags.flatMap((tag) =>
      tokenize(tag),
    ),
  );

  const claimMatches = [...queryTokens].filter(
    (token) => claimTokens.has(token),
  );

  const tagMatches = [...queryTokens].filter(
    (token) => tagTokens.has(token),
  );

  const topicMatches = [...queryTokens].filter(
    (token) => topicTokens.has(token),
  );

  /*
   * Retrieval must be driven by the claim or tags,
   * unless the caller supplied an explicit structured
   * filter that matches the item.
   *
   * This preserves the v3.7 protection against broad
   * topic-only matches while keeping the existing
   * topic/geography query API compatible.
   */
  if (
    claimMatches.length === 0 &&
    tagMatches.length === 0 &&
    !exactTopicFilter &&
    !exactGeographyFilter
  ) {
    return 0;
  }

  /*
   * Claim/tag matches are the primary lexical signals.
   * Explicit structured filters are independent retrieval
   * signals and receive their own deterministic boost.
   */
  let score =
    claimMatches.length * 8 +
    tagMatches.length * 4 +
    topicMatches.length;

  if (exactTopicFilter) {
    score += 5;
  }

  if (exactGeographyFilter) {
    score += 8;
  }

  if (options.tags?.length) {
    const itemTags = new Set(
      item.tags.map((tag) =>
        normalize(tag),
      ),
    );

    for (const tag of options.tags) {
      if (
        itemTags.has(normalize(tag))
      ) {
        score += 4;
      }
    }
  }

  if (
    item.verificationStatus ===
      "VERIFIED"
  ) {
    score += 2;
  }

  return score;
}


function matchesVerifiedOnly(
  item: KnowledgeItem,
  options: KnowledgeQueryOptions,
): boolean {
  return (
    !options.verifiedOnly ||
    item.verificationStatus ===
      "VERIFIED"
  );
}

function selectItems(
  query: string,
  items: KnowledgeItem[],
  options: KnowledgeQueryOptions,
): Array<{
  item: KnowledgeItem;
  score: number;
}> {
  const scored = items
    .filter((item) =>
      matchesVerifiedOnly(item, options),
    )
    .map((item) => ({
      item,
      score: scoreItem(
        query,
        item,
        options,
      ),
    }))
    .filter(
      (entry) => entry.score > 0,
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (
        b.item.confidence !==
        a.item.confidence
      ) {
        return (
          b.item.confidence -
          a.item.confidence
        );
      }

      return b.item.updatedAt.localeCompare(
        a.item.updatedAt,
      );
    });

  const limit = Math.max(
    1,
    options.limit ?? DEFAULT_LIMIT,
  );

  return scored.slice(0, limit);
}

export class KnowledgeQueryService {
  constructor(
    private readonly repository =
      createKnowledgeRepository(),
  ) {}

  async query(
    query: string,
    options: KnowledgeQueryOptions = {},
  ): Promise<KnowledgeQueryResult> {
    const normalizedQuery =
      query.trim();

    if (!normalizedQuery) {
      return noMatch(normalizedQuery);
    }

    const allItems =
      await this.repository.list();

    const selected = selectItems(
      normalizedQuery,
      allItems,
      options,
    );

    if (selected.length === 0) {
      return noMatch(normalizedQuery);
    }

    const candidates: KnowledgeQueryCandidate[] =
      [];

    for (const entry of selected) {
      const existingItems =
        allItems.filter(
          (item) =>
            item.id !== entry.item.id,
        );

      const verification =
        await verifyKnowledgeItem(
          entry.item,
          existingItems,
        );

      candidates.push({
        item: entry.item,
        score: entry.score,
        verification,
      });
    }

    const trustedCandidates =
      candidates.filter(
        (candidate) =>
          candidate.verification.status !==
          "REJECTED",
      );

    if (trustedCandidates.length === 0) {
      const rejected = candidates[0];

      return {
        query: normalizedQuery,
        matchedItems: candidates.length,
        candidates,
        trustedAnswer:
          buildAggregatedTrustedAnswer({
            answer: rejected.item.claim,
            items: [rejected.item],
            verifications: [
              {
                item: rejected.item,
                verification:
                  rejected.verification,
              },
            ],
          }),
        status: "REJECTED",
      };
    }

    const primary =
      trustedCandidates[0];

    const verifications =
      trustedCandidates.map(
        (candidate) => ({
          item: candidate.item,
          verification:
            candidate.verification,
        }),
      );

    const trustedAnswer =
      buildAggregatedTrustedAnswer({
        answer: primary.item.claim,
        items: trustedCandidates.map(
          (candidate) => candidate.item,
        ),
        verifications,
      });

    return {
      query: normalizedQuery,
      matchedItems: candidates.length,
      candidates,
      trustedAnswer,
      status: trustedAnswer.status,
    };
  }
}

function noMatch(
  query: string,
): KnowledgeQueryResult {
  return {
    query,
    matchedItems: 0,
    candidates: [],
    trustedAnswer: null,
    status: "NO_MATCH",
  };
}

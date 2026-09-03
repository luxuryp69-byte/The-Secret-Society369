import type { MemoryRecord, MemoryQuery } from "../types";
import { MemoryStore } from "../storage/MemoryStore";

interface ScoredMemoryRecord {
  record: MemoryRecord;
  score: number;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).toLowerCase();
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9À-ÿ]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function countTokenMatches(
  text: string,
  tokens: string[],
): number {
  if (!text || tokens.length === 0) {
    return 0;
  }

  return tokens.reduce(
    (score, token) =>
      text.includes(token)
        ? score + 1
        : score,
    0,
  );
}

function scoreRecord(
  record: MemoryRecord,
  query: string,
): number {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return 0;
  }

  const tokens = tokenize(normalizedQuery);

  if (tokens.length === 0) {
    return 0;
  }

  const id = normalize(record.id);
  const type = normalize(record.type);
  const content = normalize(
    JSON.stringify(record.content ?? ""),
  );
  const metadata = normalize(
    JSON.stringify(record.metadata ?? ""),
  );

  let score = 0;

  if (id.includes(normalizedQuery)) {
    score += 8;
  }

  if (type.includes(normalizedQuery)) {
    score += 6;
  }

  const idMatches = countTokenMatches(
    id,
    tokens,
  );

  const typeMatches = countTokenMatches(
    type,
    tokens,
  );

  const contentMatches = countTokenMatches(
    content,
    tokens,
  );

  const metadataMatches = countTokenMatches(
    metadata,
    tokens,
  );

  score += idMatches * 4;
  score += typeMatches * 3;
  score += contentMatches * 2;
  score += metadataMatches;

  if (content.includes(normalizedQuery)) {
    score += 4;
  }

  if (metadata.includes(normalizedQuery)) {
    score += 2;
  }

  return score;
}

export class MemoryRetriever {
  constructor(
    private readonly store = new MemoryStore(),
  ) {}

  async search(
    query: MemoryQuery,
  ): Promise<MemoryRecord[]> {
    const records = await this.store.getAll();

    const scored: ScoredMemoryRecord[] = records
      .map((record) => ({
        record,
        score: scoreRecord(
          record,
          query.text,
        ),
      }))
      .filter(
        ({ score }) => score > 0,
      )
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.record.id.localeCompare(
            b.record.id,
          ),
      );

    const limit =
      query.limit === undefined
        ? scored.length
        : Math.max(0, query.limit);

    return scored
      .slice(0, limit)
      .map(({ record }) => record);
  }
}

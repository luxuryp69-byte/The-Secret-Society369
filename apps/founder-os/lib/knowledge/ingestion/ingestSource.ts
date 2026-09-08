import { randomUUID } from "node:crypto";
import { searchKnowledgeLibrary, saveKnowledge } from "../service";
import type { KnowledgeItem } from "../types";
import { verifyClaim } from "../verification/verifyClaim";
import { extractClaims } from "./extractClaims";
import { fetchSource } from "./fetchSource";

export interface IngestSourceResult {
  source: {
    url: string;
    finalUrl: string;
    title: string;
    fetchedAt: string;
  };
  items: KnowledgeItem[];
}

export async function ingestSource(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IngestSourceResult> {
  const document = await fetchSource(url, fetchImpl);
  const claims = extractClaims(document);

  const existingItems = await searchKnowledgeLibrary({
    limit: 500,
  });

  const items: KnowledgeItem[] = [];

  for (const extracted of claims) {
    const now = new Date().toISOString();

    const item: KnowledgeItem = {
      id: randomUUID(),
      claim: extracted.claim,
      source: extracted.source,
      topic: extracted.topic,
      confidence: extracted.confidence,
      verificationStatus: "UNVERIFIED",
      tags: extracted.tags,
      createdAt: now,
      updatedAt: now,
    };

    const verification = verifyClaim(
      item,
      [...existingItems, ...items],
      new Date(),
    );

    item.verificationStatus = verification.status;
    item.updatedAt = new Date().toISOString();

    await saveKnowledge(item);
    items.push(item);
  }

  return {
    source: {
      url: document.url,
      finalUrl: document.finalUrl,
      title: document.title,
      fetchedAt: document.fetchedAt,
    },
    items,
  };
}

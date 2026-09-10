import { randomUUID } from "node:crypto";

import {
  searchKnowledgeLibrary,
  upsertKnowledge,
} from "../service";

import {
  createKnowledgeFingerprint,
} from "../deduplication/fingerprint";

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

    const contentHash = createKnowledgeFingerprint(
      extracted.claim,
      document.finalUrl,
    );

    const candidate: KnowledgeItem = {
      id: randomUUID(),
      claim: extracted.claim,
      source: {
        ...extracted.source,
        url: document.finalUrl,
      },
      topic: extracted.topic,
      confidence: extracted.confidence,
      verificationStatus: "UNVERIFIED",
      tags: extracted.tags,
      provenance: {
        sourceUrl: document.finalUrl,
        fetchedAt: document.fetchedAt,
      },
      contentHash,
      createdAt: now,
      updatedAt: now,
    };

    const persisted = await upsertKnowledge(
      candidate,
    );

    const verification = verifyClaim(
      persisted,
      [
        ...existingItems.filter(
          (existing) =>
            existing.id !== persisted.id,
        ),
        ...items.filter(
          (item) =>
            item.id !== persisted.id,
        ),
      ],
      new Date(),
    );

    const verifiedItem: KnowledgeItem = {
      ...persisted,
      verificationStatus: verification.status,
      verifiedAt:
        verification.status === "VERIFIED"
          ? new Date().toISOString()
          : persisted.verifiedAt,
      provenance: {
        sourceUrl:
          persisted.provenance?.sourceUrl ??
          document.finalUrl,
        fetchedAt:
          persisted.provenance?.fetchedAt ??
          document.fetchedAt,
        publishedAt:
          persisted.provenance?.publishedAt ??
          persisted.publishedAt,
        verifiedAt:
          verification.status === "VERIFIED"
            ? new Date().toISOString()
            : persisted.provenance?.verifiedAt,
      },
      updatedAt: new Date().toISOString(),
    };

    const finalItem = await upsertKnowledge(
      verifiedItem,
    );

    items.push(finalItem);
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

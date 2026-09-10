import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  canonicalizeSourceUrl,
  createKnowledgeFingerprint,
  normalizeClaim,
} from "../lib/knowledge/deduplication/fingerprint";

import { LocalKnowledgeRepository } from "../lib/knowledge/repository/LocalKnowledgeRepository";

import type { KnowledgeItem } from "../lib/knowledge/types";

function createItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    claim: "The market grew by 10 percent.",
    source: {
      title: "Example Source",
      url: "https://example.com/report",
      publisher: "Example",
      type: "official",
    },
    topic: "market",
    confidence: 90,
    verificationStatus: "VERIFIED",
    tags: ["market"],
    provenance: {
      sourceUrl: "https://example.com/report",
      fetchedAt: now,
      publishedAt: "2026-01-01T00:00:00.000Z",
      verifiedAt: now,
    },
    contentHash: createKnowledgeFingerprint(
      "The market grew by 10 percent.",
      "https://example.com/report",
    ),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function testSameClaimSameSourceDeduplicates() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "founder-os-v3-"),
  );

  const filePath = path.join(
    directory,
    "knowledge.json",
  );

  try {
    const repository =
      new LocalKnowledgeRepository(filePath);

    const first = createItem();

    const second = createItem({
      id: crypto.randomUUID(),
      updatedAt: new Date(
        Date.now() + 1000,
      ).toISOString(),
    });

    const firstPersisted =
      await repository.upsert(first);

    const secondPersisted =
      await repository.upsert(second);

    const items = await repository.list();

    assert.equal(items.length, 1);
    assert.equal(
      secondPersisted.id,
      firstPersisted.id,
    );
    assert.equal(
      secondPersisted.createdAt,
      firstPersisted.createdAt,
    );

    console.log(
      "✅ same claim + same source deduplicates",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testNormalizedClaimDeduplicates() {
  const claimA =
    "The market grew by 10 percent.";

  const claimB =
    "  THE MARKET GREW BY 10 PERCENT!  ";

  assert.equal(
    normalizeClaim(claimA),
    normalizeClaim(claimB),
  );

  assert.equal(
    createKnowledgeFingerprint(
      claimA,
      "https://example.com/report",
    ),
    createKnowledgeFingerprint(
      claimB,
      "https://example.com/report",
    ),
  );

  console.log(
    "✅ normalized claims produce the same fingerprint",
  );
}

async function testDifferentSourceCreatesDifferentRecord() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "founder-os-v3-"),
  );

  const filePath = path.join(
    directory,
    "knowledge.json",
  );

  try {
    const repository =
      new LocalKnowledgeRepository(filePath);

    const first = createItem();

    const second = createItem({
      id: crypto.randomUUID(),
      source: {
        ...first.source,
        url: "https://other.example.com/report",
      },
      provenance: {
        sourceUrl:
          "https://other.example.com/report",
        fetchedAt:
          first.provenance?.fetchedAt ??
          first.updatedAt,
        publishedAt:
          first.provenance?.publishedAt ??
          first.publishedAt,
        verifiedAt:
          first.provenance?.verifiedAt ??
          first.verifiedAt,
      },
      contentHash:
        createKnowledgeFingerprint(
          first.claim,
          "https://other.example.com/report",
        ),
    });

    await repository.upsert(first);
    await repository.upsert(second);

    const items = await repository.list();

    assert.equal(items.length, 2);
    assert.notEqual(
      items[0].id,
      items[1].id,
    );

    console.log(
      "✅ same claim + different source creates two records",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testEquivalentUrlsShareFingerprint() {
  const firstUrl =
    "https://example.com/report/?b=2&a=1#section";

  const secondUrl =
    "https://EXAMPLE.com/report?a=1&b=2";

  assert.equal(
    canonicalizeSourceUrl(firstUrl),
    canonicalizeSourceUrl(secondUrl),
  );

  assert.equal(
    createKnowledgeFingerprint(
      "Market growth was 10 percent.",
      firstUrl,
    ),
    createKnowledgeFingerprint(
      "Market growth was 10 percent.",
      secondUrl,
    ),
  );

  console.log(
    "✅ equivalent URLs produce the same fingerprint",
  );
}

async function testProvenanceIsPreserved() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "founder-os-v3-"),
  );

  const filePath = path.join(
    directory,
    "knowledge.json",
  );

  try {
    const repository =
      new LocalKnowledgeRepository(filePath);

    const first = createItem();

    await repository.upsert(first);

    const stored =
      await repository.findByFingerprint(
        first.contentHash!,
      );

    assert.ok(stored);
    assert.equal(
      stored.provenance?.sourceUrl,
      "https://example.com/report",
    );
    assert.equal(
      stored.provenance?.publishedAt,
      "2026-01-01T00:00:00.000Z",
    );
    assert.ok(
      stored.provenance?.fetchedAt,
    );
    assert.ok(
      stored.provenance?.verifiedAt,
    );

    console.log(
      "✅ provenance is persisted",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function main() {
  await testSameClaimSameSourceDeduplicates();
  await testNormalizedClaimDeduplicates();
  await testDifferentSourceCreatesDifferentRecord();
  await testEquivalentUrlsShareFingerprint();
  await testProvenanceIsPreserved();

  console.log(
    "\n🎉 Knowledge Layer v3 tests passed.",
  );
}

main().catch((error) => {
  console.error(
    "\n❌ Knowledge Layer v3 tests failed.",
    error,
  );

  process.exitCode = 1;
});

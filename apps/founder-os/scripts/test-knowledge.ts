import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LocalKnowledgeRepository } from "../lib/knowledge/repository/LocalKnowledgeRepository";
import { searchKnowledge } from "../lib/knowledge/retrieval/searchKnowledge";
import { calculateVerificationStatus } from "../lib/knowledge/verification/status";
import type { KnowledgeItem } from "../lib/knowledge/types";

function createItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  return {
    id: "knowledge-1",
    claim: "Example claim",
    source: {
      title: "Example source",
      url: "https://example.com",
      publisher: "Example Publisher",
      type: "research",
    },
    topic: "entrepreneurship",
    geography: "global",
    confidence: 90,
    verificationStatus: "VERIFIED",
    tags: ["business"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function testRepository(): Promise<void> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "founder-os-knowledge-"),
  );

  try {
    const filePath = path.join(
      directory,
      "knowledge.json",
    );

    const repository =
      new LocalKnowledgeRepository(filePath);

    const item = createItem();

    await repository.save(item);

    const loaded = await repository.get(item.id);

    if (!loaded || loaded.claim !== item.claim) {
      throw new Error(
        "Repository failed to persist knowledge.",
      );
    }

    await repository.delete(item.id);

    const deleted = await repository.get(item.id);

    if (deleted !== null) {
      throw new Error(
        "Repository failed to delete knowledge.",
      );
    }

    console.log("✅ repository persistence");
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

function testVerificationExpiry(): void {
  const item = createItem({
    expiresAt: "2026-01-01T00:00:00.000Z",
  });

  const status = calculateVerificationStatus(
    item,
    new Date("2026-02-01T00:00:00.000Z"),
  );

  if (status !== "STALE") {
    throw new Error(
      `Expected STALE, got ${status}.`,
    );
  }

  console.log("✅ verification expiry");
}

function testVerifiedSearch(): void {
  const verified = createItem({
    id: "verified",
    verificationStatus: "VERIFIED",
  });

  const unverified = createItem({
    id: "unverified",
    verificationStatus: "UNVERIFIED",
  });

  const results = searchKnowledge(
    [unverified, verified],
    {
      verifiedOnly: true,
    },
  );

  if (
    results.length !== 1 ||
    results[0]?.id !== "verified"
  ) {
    throw new Error(
      "verifiedOnly retrieval returned incorrect results.",
    );
  }

  console.log("✅ verified retrieval");
}

function testTopicAndGeography(): void {
  const matching = createItem({
    id: "matching",
    topic: "creator economy",
    geography: "Mexico",
  });

  const other = createItem({
    id: "other",
    topic: "venture capital",
    geography: "United States",
  });

  const results = searchKnowledge(
    [other, matching],
    {
      topic: "creator",
      geography: "mexico",
    },
  );

  if (
    results.length !== 1 ||
    results[0]?.id !== "matching"
  ) {
    throw new Error(
      "topic/geography retrieval returned incorrect results.",
    );
  }

  console.log("✅ topic and geography retrieval");
}

async function main(): Promise<void> {
  await testRepository();
  testVerificationExpiry();
  testVerifiedSearch();
  testTopicAndGeography();

  console.log("\n🎉 Knowledge Layer v1 tests passed.");
}

main().catch((error) => {
  console.error("\n❌ Knowledge Layer v1 tests failed.");
  console.error(
    error instanceof Error
      ? error.message
      : String(error),
  );
  process.exitCode = 1;
});

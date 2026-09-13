import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  LocalKnowledgeConflictRepository,
} from "../lib/knowledge/conflicts/conflictRepository";
import {
  dismissConflict,
  persistDetectedConflicts,
  resolveConflict,
} from "../lib/knowledge/conflicts/conflictService";
import {
  verifyKnowledgeItem,
} from "../lib/knowledge/verification/verificationOrchestrator";
import type { KnowledgeItem } from "../lib/knowledge/types";

const NOW = new Date("2026-09-10T12:00:00.000Z");

function createItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  return {
    id: "item-a",
    claim: "The platform supports feature X.",
    source: {
      title: "Official Source",
      url: "https://official.example.com/feature-x",
      publisher: "Official Publisher",
      type: "official",
    },
    topic: "feature-x",
    confidence: 95,
    verificationStatus: "UNVERIFIED",
    tags: ["feature-x"],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function createConflictingItem(): KnowledgeItem {
  return createItem({
    id: "item-b",
    claim: "The platform does not support feature X.",
    source: {
      title: "Independent Source",
      url: "https://independent.example.com/feature-x",
      publisher: "Independent Publisher",
      type: "news",
    },
  });
}

async function withRepository<T>(
  callback: (
    repository: LocalKnowledgeConflictRepository,
  ) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "founder-os-v3-3-"),
  );

  const filePath = path.join(
    directory,
    "knowledge-conflicts.json",
  );

  try {
    return await callback(
      new LocalKnowledgeConflictRepository(filePath),
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testActiveConflictBlocksVerification(): Promise<void> {
  await withRepository(async (repository) => {
    const item = createItem();
    const conflictingItem = createConflictingItem();

    const persisted = await persistDetectedConflicts(
      item,
      [conflictingItem],
      {
        repository,
        now: NOW,
      },
    );

    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].status, "OPEN");

    const result = await verifyKnowledgeItem(
      item,
      [],
      {
        conflictRepository: repository,
        now: NOW,
      },
    );

    assert.equal(result.status, "DISPUTED");
    assert.equal(result.conflictingSources, 1);
  });

  console.log(
    "✅ active persisted conflict blocks verification",
  );
}

async function testReviewingConflictBlocksVerification(): Promise<void> {
  await withRepository(async (repository) => {
    const item = createItem();
    const conflictingItem = createConflictingItem();

    const persisted = await persistDetectedConflicts(
      item,
      [conflictingItem],
      {
        repository,
        now: NOW,
      },
    );

    const conflictId = persisted[0].id;
    assert.ok(conflictId);

    await repository.updateStatus(
      conflictId!,
      "REVIEWING",
    );

    const result = await verifyKnowledgeItem(
      item,
      [],
      {
        conflictRepository: repository,
        now: NOW,
      },
    );

    assert.equal(result.status, "DISPUTED");
    assert.equal(result.conflictingSources, 1);
  });

  console.log(
    "✅ reviewing persisted conflict blocks verification",
  );
}

async function testResolvedConflictAllowsVerification(): Promise<void> {
  await withRepository(async (repository) => {
    const item = createItem();
    const conflictingItem = createConflictingItem();

    const persisted = await persistDetectedConflicts(
      item,
      [conflictingItem],
      {
        repository,
        now: NOW,
      },
    );

    const conflictId = persisted[0].id;
    assert.ok(conflictId);

    await resolveConflict(
      conflictId!,
      {
        resolvedBy: "knowledge-reviewer",
        resolvedAt: NOW.toISOString(),
        explanation:
          "The independent claim was determined to be outdated.",
        evidence: [
          "https://official.example.com/feature-x",
        ],
      },
      repository,
    );

    const result = await verifyKnowledgeItem(
      item,
      [],
      {
        conflictRepository: repository,
        now: NOW,
      },
    );

    assert.equal(result.status, "VERIFIED");
    assert.equal(result.conflictingSources, 0);

    const historical =
      await repository.get(conflictId!);

    assert.equal(historical?.status, "RESOLVED");
  });

  console.log(
    "✅ resolved conflict allows reverification",
  );
}

async function testDismissedConflictAllowsVerification(): Promise<void> {
  await withRepository(async (repository) => {
    const item = createItem();
    const conflictingItem = createConflictingItem();

    const persisted = await persistDetectedConflicts(
      item,
      [conflictingItem],
      {
        repository,
        now: NOW,
      },
    );

    const conflictId = persisted[0].id;
    assert.ok(conflictId);

    await dismissConflict(
      conflictId!,
      {
        resolvedBy: "knowledge-reviewer",
        resolvedAt: NOW.toISOString(),
        explanation:
          "The detected disagreement was not materially conflicting.",
        evidence: [
          "https://official.example.com/feature-x",
        ],
      },
      repository,
    );

    const result = await verifyKnowledgeItem(
      item,
      [],
      {
        conflictRepository: repository,
        now: NOW,
      },
    );

    assert.equal(result.status, "VERIFIED");
    assert.equal(result.conflictingSources, 0);

    const historical =
      await repository.get(conflictId!);

    assert.equal(historical?.status, "DISMISSED");
  });

  console.log(
    "✅ dismissed conflict allows reverification",
  );
}

async function testNoPersistedConflictUsesNormalVerification(): Promise<void> {
  await withRepository(async (repository) => {
    const item = createItem();

    const result = await verifyKnowledgeItem(
      item,
      [],
      {
        conflictRepository: repository,
        now: NOW,
      },
    );

    assert.equal(result.status, "VERIFIED");
    assert.equal(result.conflictingSources, 0);
  });

  console.log(
    "✅ no persisted conflict uses normal verification",
  );
}

async function run(): Promise<void> {
  await testActiveConflictBlocksVerification();
  await testReviewingConflictBlocksVerification();
  await testResolvedConflictAllowsVerification();
  await testDismissedConflictAllowsVerification();
  await testNoPersistedConflictUsesNormalVerification();

  console.log(
    "\n🎉 Knowledge Layer v3.3 tests passed.",
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

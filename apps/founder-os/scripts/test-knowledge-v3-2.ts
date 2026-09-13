import assert from "node:assert/strict";

import {
  mkdtemp,
  rm,
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";

import {
  LocalKnowledgeConflictRepository,
} from "../lib/knowledge/conflicts/conflictRepository";

import {
  dismissConflict,
  persistDetectedConflicts,
  resolveConflict,
  startConflictReview,
} from "../lib/knowledge/conflicts/conflictService";

import {
  verifyClaim,
} from "../lib/knowledge/verification/verifyClaim";

import type {
  KnowledgeItem,
} from "../lib/knowledge/types";

const NOW = new Date(
  "2026-09-10T12:00:00.000Z",
);

function createItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  return {
    id: crypto.randomUUID(),
    claim:
      "The program supports eligible founders.",
    source: {
      title: "Example Source",
      url: "https://example.com/source",
      publisher: "Example",
      type: "government",
    },
    topic: "founder-support",
    confidence: 90,
    verificationStatus: "UNVERIFIED",
    tags: ["founders"],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function createRepositoryPath(
  directory: string,
): string {
  return path.join(
    directory,
    "knowledge-conflicts.json",
  );
}

async function testConflictPersistence() {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "founder-os-v3-2-",
    ),
  );

  try {
    const repository =
      new LocalKnowledgeConflictRepository(
        createRepositoryPath(directory),
      );

    const first = createItem({
      id: "item-a",
      claim:
        "The program supports eligible founders.",
      source: {
        title: "Government Source",
        url: "https://gov.example/program",
        publisher: "gov.example",
        type: "government",
      },
    });

    const second = createItem({
      id: "item-b",
      claim:
        "The program does not support eligible founders.",
      source: {
        title: "Research Source",
        url: "https://research.example/program",
        publisher: "research.example",
        type: "research",
      },
    });

    const conflicts =
      await persistDetectedConflicts(
        second,
        [first],
        {
          repository,
          now: NOW,
        },
      );

    assert.equal(conflicts.length, 1);
    assert.equal(
      conflicts[0]?.status,
      "OPEN",
    );

    const stored = await repository.list();

    assert.equal(stored.length, 1);
    assert.equal(
      stored[0]?.status,
      "OPEN",
    );

    console.log(
      "✅ conflict persistence",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testConflictDeduplication() {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "founder-os-v3-2-",
    ),
  );

  try {
    const repository =
      new LocalKnowledgeConflictRepository(
        createRepositoryPath(directory),
      );

    const first = createItem({
      id: "item-a",
      source: {
        title: "Government Source",
        url: "https://gov.example/program",
        publisher: "gov.example",
        type: "government",
      },
    });

    const second = createItem({
      id: "item-b",
      claim:
        "The program does not support eligible founders.",
      source: {
        title: "Research Source",
        url: "https://research.example/program",
        publisher: "research.example",
        type: "research",
      },
    });

    await persistDetectedConflicts(
      second,
      [first],
      {
        repository,
        now: NOW,
      },
    );

    await persistDetectedConflicts(
      second,
      [first],
      {
        repository,
        now: new Date(
          "2026-09-10T13:00:00.000Z",
        ),
      },
    );

    const conflicts =
      await repository.list();

    assert.equal(conflicts.length, 1);

    console.log(
      "✅ conflict deduplication",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testReviewLifecycle() {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "founder-os-v3-2-",
    ),
  );

  try {
    const repository =
      new LocalKnowledgeConflictRepository(
        createRepositoryPath(directory),
      );

    const first = createItem({
      id: "item-a",
      source: {
        title: "Government Source",
        url: "https://gov.example/program",
        publisher: "gov.example",
        type: "government",
      },
    });

    const second = createItem({
      id: "item-b",
      claim:
        "The program does not support eligible founders.",
      source: {
        title: "Research Source",
        url: "https://research.example/program",
        publisher: "research.example",
        type: "research",
      },
    });

    const created =
      await persistDetectedConflicts(
        second,
        [first],
        {
          repository,
          now: NOW,
        },
      );

    const id = created[0]?.id;

    assert.ok(id);

    const reviewing =
      await startConflictReview(
        id,
        repository,
      );

    assert.equal(
      reviewing?.status,
      "REVIEWING",
    );

    console.log(
      "✅ conflict review lifecycle",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testResolutionAndReverification() {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "founder-os-v3-2-",
    ),
  );

  try {
    const repository =
      new LocalKnowledgeConflictRepository(
        createRepositoryPath(directory),
      );

    const authoritative = createItem({
      id: "item-a",
      claim:
        "The program supports eligible founders.",
      source: {
        title: "Government Source",
        url: "https://gov.example/program",
        publisher: "gov.example",
        type: "government",
      },
    });

    const conflicting = createItem({
      id: "item-b",
      claim:
        "The program does not support eligible founders.",
      source: {
        title: "Research Source",
        url: "https://research.example/program",
        publisher: "research.example",
        type: "research",
      },
    });

    const created =
      await persistDetectedConflicts(
        conflicting,
        [authoritative],
        {
          repository,
          now: NOW,
        },
      );

    const conflictId =
      created[0]?.id;

    assert.ok(conflictId);

    const disputed = verifyClaim(
      conflicting,
      [authoritative],
      NOW,
    );

    assert.equal(
      disputed.status,
      "DISPUTED",
    );

    const resolved =
      await resolveConflict(
        conflictId,
        {
          resolvedBy: "verification-engine",
          resolvedAt:
            "2026-09-10T14:00:00.000Z",
          explanation:
            "The government source is the authoritative source for the program eligibility rule.",
          evidence: [
            "https://gov.example/program",
          ],
        },
        repository,
      );

    assert.equal(
      resolved?.status,
      "RESOLVED",
    );

    const historical =
      await repository.get(
        conflictId,
      );

    assert.equal(
      historical?.status,
      "RESOLVED",
    );

    assert.ok(
      historical?.resolution,
    );

    /*
     * A resolved conflict no longer blocks the
     * pure verifier when the contradictory item
     * is no longer part of the active evidence set.
     */
    const reverified = verifyClaim(
      authoritative,
      [],
      NOW,
    );

    assert.equal(
      reverified.status,
      "VERIFIED",
    );

    console.log(
      "✅ conflict resolution + reverification",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testDismissalPreservesHistory() {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "founder-os-v3-2-",
    ),
  );

  try {
    const repository =
      new LocalKnowledgeConflictRepository(
        createRepositoryPath(directory),
      );

    const first = createItem({
      id: "item-a",
      source: {
        title: "Source A",
        url: "https://a.example/program",
        publisher: "a.example",
        type: "research",
      },
    });

    const second = createItem({
      id: "item-b",
      claim:
        "The program does not support eligible founders.",
      source: {
        title: "Source B",
        url: "https://b.example/program",
        publisher: "b.example",
        type: "research",
      },
    });

    const created =
      await persistDetectedConflicts(
        second,
        [first],
        {
          repository,
          now: NOW,
        },
      );

    const id = created[0]?.id;

    assert.ok(id);

    const dismissed =
      await dismissConflict(
        id,
        {
          resolvedBy: "reviewer",
          resolvedAt:
            "2026-09-10T15:00:00.000Z",
          explanation:
            "The apparent disagreement came from different scopes.",
          evidence: [
            "https://a.example/program",
            "https://b.example/program",
          ],
        },
        repository,
      );

    assert.equal(
      dismissed?.status,
      "DISMISSED",
    );

    const active =
      await repository.listActive();

    assert.equal(
      active.length,
      0,
    );

    const history =
      await repository.list();

    assert.equal(
      history.length,
      1,
    );

    assert.equal(
      history[0]?.status,
      "DISMISSED",
    );

    assert.ok(
      history[0]?.resolution,
    );

    console.log(
      "✅ dismissal preserves history",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function testClosedConflictCannotBeReopened() {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      "founder-os-v3-2-",
    ),
  );

  try {
    const repository =
      new LocalKnowledgeConflictRepository(
        createRepositoryPath(directory),
      );

    const conflict = createItem({
      id: "item-a",
    });

    const other = createItem({
      id: "item-b",
      claim:
        "The program does not support eligible founders.",
      source: {
        title: "Other Source",
        url: "https://other.example/program",
        publisher: "other.example",
        type: "research",
      },
    });

    const created =
      await persistDetectedConflicts(
        other,
        [conflict],
        {
          repository,
          now: NOW,
        },
      );

    const id = created[0]?.id;

    assert.ok(id);

    await dismissConflict(
      id,
      {
        resolvedBy: "reviewer",
        resolvedAt:
          "2026-09-10T16:00:00.000Z",
        explanation:
          "False positive after manual review.",
        evidence: [],
      },
      repository,
    );

    await assert.rejects(
      () =>
        startConflictReview(
          id,
          repository,
        ),
      /Historical conflicts cannot return to review/,
    );

    console.log(
      "✅ closed conflicts remain historical",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

async function main() {
  await testConflictPersistence();
  await testConflictDeduplication();
  await testReviewLifecycle();
  await testResolutionAndReverification();
  await testDismissalPreservesHistory();
  await testClosedConflictCannotBeReopened();

  console.log(
    "\n🎉 Knowledge Layer v3.2 tests passed.",
  );
}

main().catch((error) => {
  console.error(
    "\n❌ Knowledge Layer v3.2 tests failed.",
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});

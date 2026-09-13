import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { KnowledgeItem } from "../lib/knowledge/types";
import { LocalKnowledgeConflictRepository } from "../lib/knowledge/conflicts/conflictRepository";
import { verifyKnowledgeItem } from "../lib/knowledge/verification/verificationOrchestrator";

const NOW = new Date("2026-09-10T12:00:00.000Z");

function createItem(
  id: string,
  claim: string,
  sourceType: KnowledgeItem["source"]["type"] = "official",
): KnowledgeItem {
  return {
    id,
    claim,
    source: {
      title: `${sourceType} source`,
      url: `https://example.com/${id}`,
      publisher: sourceType,
      type: sourceType,
    },
    topic: "test-topic",
    confidence: 95,
    verificationStatus: "UNVERIFIED",
    tags: ["test"],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

async function createRepository() {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "founder-os-v3-4-"),
  );

  return {
    directory,
    repository: new LocalKnowledgeConflictRepository(
      path.join(directory, "conflicts.json"),
    ),
  };
}

async function testExplainableNormalVerification() {
  const item = createItem(
    "item-a",
    "Founder OS supports verified knowledge.",
  );

  const result = await verifyKnowledgeItem(
    item,
    [],
    { now: NOW },
  );

  assert.equal(result.status, "VERIFIED");
  assert.ok(result.evidence.evidence.length >= 5);
  assert.ok(result.decision.explanation.length > 0);
  assert.equal(
    result.decision.status,
    result.status,
  );

  console.log("✅ normal verification produces explainable evidence");
}

async function testActiveConflictProducesNegativeEvidence() {
  const { directory, repository } =
    await createRepository();

  try {
    const item = createItem(
      "item-a",
      "Founder OS supports verified knowledge.",
    );

    const conflictingItem = createItem(
      "item-b",
      "Founder OS does not support verified knowledge.",
      "news",
    );

    await repository.save({
      id: "conflict-1",
      type: "EXPLICIT_NEGATION",
      itemId: item.id,
      conflictingItemId: conflictingItem.id,
      topic: item.topic,
      reason: "The sources explicitly contradict each other.",
      sourceUrls: [
        item.source.url,
        conflictingItem.source.url,
      ],
      status: "OPEN",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });

    const result = await verifyKnowledgeItem(
      item,
      [],
      {
        conflictRepository: repository,
        now: NOW,
      },
    );

    assert.equal(result.status, "DISPUTED");
    assert.ok(
      result.evidence.negativeSignals > 0,
    );
    assert.ok(
      result.evidence.evidence.some(
        (entry) =>
          entry.type === "CONFLICT" &&
          entry.signal === "NEGATIVE",
      ),
    );

    console.log("✅ active conflict produces negative evidence");

    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
    throw error;
  }
}

async function testHighAuthorityProducesPositiveEvidence() {
  const item = createItem(
    "item-authority",
    "Official knowledge claim.",
    "government",
  );

  const result = await verifyKnowledgeItem(
    item,
    [],
    { now: NOW },
  );

  assert.ok(
    result.evidence.evidence.some(
      (entry) =>
        entry.type === "SOURCE_AUTHORITY" &&
        entry.signal === "POSITIVE",
    ),
  );

  console.log("✅ authority is represented as evidence");
}

async function testExpiredItemProducesNegativeFreshness() {
  const item = createItem(
    "item-expired",
    "Expired knowledge claim.",
  );

  item.expiresAt = "2026-09-01T00:00:00.000Z";

  const result = await verifyKnowledgeItem(
    item,
    [],
    { now: NOW },
  );

  assert.ok(
    result.evidence.evidence.some(
      (entry) =>
        entry.type === "FRESHNESS" &&
        entry.signal === "NEGATIVE",
    ),
  );

  console.log("✅ expired knowledge produces negative freshness evidence");
}

async function testDecisionMatchesVerificationStatus() {
  const item = createItem(
    "item-decision",
    "Decision consistency claim.",
  );

  const result = await verifyKnowledgeItem(
    item,
    [],
    { now: NOW },
  );

  assert.equal(
    result.decision.status,
    result.status,
  );

  assert.equal(
    result.decision.evidence,
    result.evidence,
  );

  console.log("✅ decision remains consistent with verification result");
}

async function main() {
  await testExplainableNormalVerification();
  await testActiveConflictProducesNegativeEvidence();
  await testHighAuthorityProducesPositiveEvidence();
  await testExpiredItemProducesNegativeFreshness();
  await testDecisionMatchesVerificationStatus();

  console.log(
    "\n🎉 Knowledge Layer v3.4 tests passed.",
  );
}

void main();

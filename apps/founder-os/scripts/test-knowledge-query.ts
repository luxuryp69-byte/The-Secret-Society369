import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { KnowledgeItem } from "../lib/knowledge/types";
import { KnowledgeQueryService } from "../lib/knowledge/query/knowledgeQueryService";
import { LocalKnowledgeRepository } from "../lib/knowledge/repository/LocalKnowledgeRepository";

async function main() {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "founder-os-query-"),
  );

  const storagePath = path.join(
    tempDir,
    "knowledge.json",
  );

  const now = "2026-09-14T12:00:00.000Z";

  const item: KnowledgeItem = {
    id: "query-test-founder-os",
    claim: "Founder OS provides verified knowledge for founders.",
    source: {
      title: "Founder OS Official",
      url: "https://example.com/founder-os",
      publisher: "Founder OS",
      type: "official",
    },
    topic: "founder-os",
    confidence: 95,
    verificationStatus: "VERIFIED",
    tags: ["founder", "knowledge", "ai"],
    createdAt: now,
    updatedAt: now,
  };

  await writeFile(
    storagePath,
    `${JSON.stringify([item], null, 2)}\n`,
    "utf8",
  );

  const repository =
    new LocalKnowledgeRepository(storagePath);

  const service =
    new KnowledgeQueryService(repository);

  try {
    const result = await service.query(
      "How does Founder OS provide knowledge?",
    );

    console.log(
      JSON.stringify(result, null, 2),
    );

    assert.equal(
      result.matchedItems,
      1,
      "Expected one matching knowledge item.",
    );

    assert.ok(
      result.trustedAnswer,
      "Expected a trusted answer.",
    );

    assert.equal(
      result.trustedAnswer?.answer,
      item.claim,
      "Expected the trusted answer to expose the matched claim.",
    );

    assert.ok(
      result.trustedAnswer?.sources.length === 1,
      "Expected one source.",
    );

    const emptyResult = await service.query(
      "quantum banana accounting",
    );

    assert.equal(
      emptyResult.status,
      "NO_MATCH",
      "Expected NO_MATCH for unrelated query.",
    );

    assert.equal(
      emptyResult.trustedAnswer,
      null,
      "Expected no trusted answer for unrelated query.",
    );

    const blankResult = await service.query("   ");

    assert.equal(
      blankResult.status,
      "NO_MATCH",
      "Expected NO_MATCH for blank query.",
    );

    assert.equal(
      blankResult.trustedAnswer,
      null,
      "Expected no trusted answer for blank query.",
    );

    const topicResult = await service.query(
      "founder-os",
      {
        topic: "founder-os",
      },
    );

    assert.equal(
      topicResult.matchedItems,
      1,
      "Expected topic query to match the knowledge item.",
    );

    const verifiedOnlyResult = await service.query(
      "Founder OS knowledge",
      {
        verifiedOnly: true,
      },
    );

    assert.equal(
      verifiedOnlyResult.status,
      "VERIFIED",
      "Expected verifiedOnly query to return VERIFIED.",
    );

    console.log(
      "\n🎉 Knowledge Query Layer tests passed.",
    );
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

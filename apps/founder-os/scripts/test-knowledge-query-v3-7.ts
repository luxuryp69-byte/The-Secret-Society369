import fs from "node:fs/promises";
import path from "node:path";

import { KnowledgeQueryService } from "../lib/knowledge/query/knowledgeQueryService";
import { LocalKnowledgeRepository } from "../lib/knowledge/repository/LocalKnowledgeRepository";

async function main(): Promise<void> {
  const dataDir = path.join(
    process.cwd(),
    "data",
  );

  const knowledgePath = path.join(
    dataDir,
    "knowledge.json",
  );

  await fs.mkdir(dataDir, {
    recursive: true,
  });

  const original = await fs
    .readFile(knowledgePath, "utf8")
    .catch(() => "[]");

  try {
    const repository =
      new LocalKnowledgeRepository();

    const now =
      new Date().toISOString();

    await repository.save({
      id: "v37-primary",
      claim:
        "Founder OS should prioritize demand generation when the sales pipeline is almost empty.",
      source: {
        title:
          "Founder OS Strategy Report",
        url:
          "https://example.com/strategy",
        publisher: "Founder OS",
        type: "official",
      },
      topic: "founder-os",
      confidence: 95,
      verificationStatus: "VERIFIED",
      tags: [
        "founder",
        "demand",
        "pipeline",
      ],
      createdAt: now,
      updatedAt: now,
    });

    await repository.save({
      id: "v37-secondary",
      claim:
        "Founder OS should prioritize demand generation when the sales pipeline is almost empty.",
      source: {
        title:
          "Independent Business Research",
        url:
          "https://example.org/research",
        publisher:
          "Independent Research",
        type: "research",
      },
      topic: "founder-os",
      confidence: 90,
      verificationStatus: "UNVERIFIED",
      tags: [
        "founder",
        "demand",
        "pipeline",
      ],
      createdAt: now,
      updatedAt: now,
    });

    await repository.save({
      id: "v37-irrelevant",
      claim:
        "Founder OS should improve product reliability before expanding internationally.",
      source: {
        title:
          "Product Research",
        url:
          "https://example.net/product",
        publisher:
          "Product Research",
        type: "academic",
      },
      topic: "founder-os",
      confidence: 80,
      verificationStatus: "UNVERIFIED",
      tags: [
        "product",
        "reliability",
      ],
      createdAt: now,
      updatedAt: now,
    });

    const service =
      new KnowledgeQueryService(
        repository,
      );

    const result =
      await service.query(
        "Founder OS pipeline demand",
        {
          limit: 3,
        },
      );

    console.log(
      JSON.stringify(
        {
          status: result.status,
          matchedItems:
            result.matchedItems,
          candidateIds:
            result.candidates.map(
              (candidate) => ({
                id: candidate.item.id,
                score: candidate.score,
                status:
                  candidate.verification
                    .status,
              }),
            ),
          sourceCount:
            result.trustedAnswer
              ?.sources.length,
          evidenceCount:
            result.trustedAnswer
              ?.evidence.length,
          confidence:
            result.trustedAnswer
              ?.confidence,
        },
        null,
        2,
      ),
    );

    if (!result.trustedAnswer) {
      throw new Error(
        "Expected trustedAnswer.",
      );
    }

    if (result.matchedItems !== 2) {
      throw new Error(
        `Expected 2 relevant items, received ${result.matchedItems}`,
      );
    }

    if (
      result.trustedAnswer.sources
        .length !== 2
    ) {
      throw new Error(
        `Expected 2 sources, received ${result.trustedAnswer.sources.length}`,
      );
    }

    if (
      result.trustedAnswer.evidence
        .length !== 2
    ) {
      throw new Error(
        `Expected 2 evidence items, received ${result.trustedAnswer.evidence.length}`,
      );
    }

    const primaryEvidence =
      result.trustedAnswer.evidence.find(
        (evidence) =>
          evidence.itemId === "v37-primary",
      );

    const secondaryEvidence =
      result.trustedAnswer.evidence.find(
        (evidence) =>
          evidence.itemId === "v37-secondary",
      );

    if (primaryEvidence?.status !== "VERIFIED") {
      throw new Error(
        `Expected primary evidence to be VERIFIED, received ${primaryEvidence?.status}`,
      );
    }

    if (secondaryEvidence?.status !== "VERIFIED") {
      throw new Error(
        `Expected secondary evidence to be VERIFIED after dynamic verification, received ${secondaryEvidence?.status}`,
      );
    }

    if (result.trustedAnswer.status !== "VERIFIED") {
      throw new Error(
        `Expected aggregated trusted answer to be VERIFIED, received ${result.trustedAnswer.status}`,
      );
    }

    if (result.trustedAnswer.warnings.length !== 0) {
      throw new Error(
        `Expected no verification warnings, received ${result.trustedAnswer.warnings.join(", ")}`,
      );
    }

    if (
      result.candidates[0]?.item.id !==
      "v37-primary"
    ) {
      throw new Error(
        "Expected primary source to rank first.",
      );
    }

    console.log(
      "🎉 Knowledge Query v3.7 tests passed.",
    );
  } finally {
    await fs.writeFile(
      knowledgePath,
      original,
      "utf8",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

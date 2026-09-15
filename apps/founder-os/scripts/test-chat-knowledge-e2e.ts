import fs from "node:fs/promises";
import path from "node:path";

import { KnowledgeQueryService } from "../lib/knowledge/query/knowledgeQueryService";
import { LocalKnowledgeRepository } from "../lib/knowledge/repository/LocalKnowledgeRepository";

async function main(): Promise<void> {
  const dataDir = path.join(process.cwd(), "data");
  const knowledgePath = path.join(dataDir, "knowledge.json");

  await fs.mkdir(dataDir, { recursive: true });

  const original = await fs
    .readFile(knowledgePath, "utf8")
    .catch(() => "[]");

  try {
    const repository = new LocalKnowledgeRepository();

    const now = new Date().toISOString();

    await repository.save({
      id: "e2e-chat-demand",
      claim:
        "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.",
      source: {
        title: "Official Business Report",
        url: "https://example.com/business-report",
        publisher: "Founder OS",
        type: "official",
      },
      topic: "founder-os",
      confidence: 94,
      verificationStatus: "VERIFIED",
      tags: ["demand", "sales", "pipeline"],
      createdAt: now,
      updatedAt: now,
    });

    const service = new KnowledgeQueryService(repository);

    const result = await service.query(
      "¿Cuál debería ser nuestra prioridad si tenemos el pipeline comercial casi vacío?",
    );

    console.log(
      JSON.stringify(
        {
          status: result.status,
          matchedItems: result.matchedItems,
          answer: result.trustedAnswer?.answer,
          warnings: result.trustedAnswer?.warnings,
        },
        null,
        2,
      ),
    );

    if (result.status !== "VERIFIED") {
      throw new Error(
        `Expected VERIFIED, received ${result.status}`,
      );
    }

    if (!result.trustedAnswer) {
      throw new Error("Expected trustedAnswer.");
    }

    if (result.matchedItems < 1) {
      throw new Error("Expected at least one matched item.");
    }

    console.log(
      "🎉 Persistent Chat Knowledge E2E test passed.",
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

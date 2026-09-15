import assert from "node:assert/strict";

import { detectStrategicSignal } from "../lib/agents/ceo";
import { AgentKnowledgeService } from "../lib/agents/knowledge/agentKnowledgeService";
import type {
  KnowledgeQueryPort,
} from "../lib/agents/knowledge/types";
import type {
  KnowledgeQueryCandidate,
  KnowledgeQueryResult,
} from "../lib/knowledge/query/types";

function makeCandidate(
  claim: string,
): KnowledgeQueryCandidate {
  return {
    item: {
      id: "ceo-v3-9-test",
      claim,
      source: {
        title: "CEO v3.9 Test Source",
        url: "https://example.com/ceo-v3-9",
        publisher: "Founder OS",
        type: "official",
      },
      topic: "business",
      confidence: 94,
      verificationStatus: "VERIFIED",
      tags: ["demand", "pipeline"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    score: 100,
    verification: {
      status: "VERIFIED",
      authorityScore: 90,
      corroborated: true,
      supportingSources: 2,
      conflictingSources: 0,
      reason:
        "High-authority source corroborated by independent evidence.",
    },
  };
}

class FakeKnowledgeQuery
  implements KnowledgeQueryPort
{
  constructor(
    private readonly result: KnowledgeQueryResult,
  ) {}

  async query(
    _query: string,
  ): Promise<KnowledgeQueryResult> {
    return this.result;
  }
}

function makeVerifiedResult(
  claim: string,
): KnowledgeQueryResult {
  return {
    query: "prioridad estratégica",
    matchedItems: 1,
    candidates: [
      makeCandidate(claim),
    ],
    trustedAnswer: {
      answer: claim,
      confidence: 94,
      status: "VERIFIED",
      sources: [
        {
          title: "CEO v3.9 Test Source",
          publisher: "Founder OS",
          url: "https://example.com/ceo-v3-9",
          type: "official",
        },
      ],
      evidence: [
        {
          itemId: "ceo-v3-9-test",
          claim,
          status: "VERIFIED",
          confidence: 94,
          authorityScore: 90,
          corroborated: true,
          supportingSources: 2,
          conflictingSources: 0,
          reason:
            "High-authority source corroborated by independent evidence.",
        },
      ],
      warnings: [],
      explanation:
        "Verification status: VERIFIED.",
    },
    status: "VERIFIED",
  };
}

async function main(): Promise<void> {
  const claim =
    "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.";

  const queryService =
    new FakeKnowledgeQuery(
      makeVerifiedResult(claim),
    );

  const agentKnowledge =
    new AgentKnowledgeService(
      queryService,
    );

  const context =
    await agentKnowledge.getContext(
      "¿Cuál debería ser nuestra prioridad estratégica?",
    );

  assert.equal(
    context.availability,
    "AVAILABLE",
  );

  assert.equal(
    context.status,
    "VERIFIED",
  );

  assert.equal(
    context.canUseAsTrustedContext,
    true,
  );

  assert.equal(
    context.answer,
    claim,
  );

  assert.equal(
    context.sources.length,
    1,
  );

  assert.equal(
    context.evidence.length,
    1,
  );

  const signal =
    detectStrategicSignal(
      "¿Cuál debería ser nuestra prioridad estratégica?",
      {},
      context,
    );

  assert.equal(
    signal.constraint,
    "demand",
  );

  assert.ok(
    signal.confidence > 0,
  );

  console.log(
    "✓ AgentKnowledgeService produces CEO-ready verified context",
  );

  console.log(
    "✓ CEO strategic signal consumes AgentKnowledgeContext",
  );

  console.log(
    "v3.9 CEO knowledge integration tests passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

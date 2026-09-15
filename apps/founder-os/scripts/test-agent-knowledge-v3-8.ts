import assert from "node:assert/strict";

import type {
  KnowledgeQueryCandidate,
  KnowledgeQueryResult,
} from "../lib/knowledge/query/types";
import type {
  KnowledgeVerificationStatus,
} from "../lib/knowledge/types";
import {
  AgentKnowledgeService,
} from "../lib/agents/knowledge/agentKnowledgeService";
import type {
  KnowledgeQueryPort,
} from "../lib/agents/knowledge/types";

function makeResult(
  status: KnowledgeVerificationStatus,
  answer: string,
  overrides: Partial<KnowledgeQueryResult> = {},
): KnowledgeQueryResult {
  return {
    query: "best market",
    matchedItems: 1,
    candidates: [],
    trustedAnswer: {
      answer,
      confidence:
        status === "REJECTED"
          ? 0
          : status === "DISPUTED"
            ? 35
            : status === "STALE"
              ? 30
              : status === "UNVERIFIED"
                ? 50
                : 95,
      status,
      sources: [
        {
          title: "Official source",
          publisher: "Founder OS Test",
          url: "https://example.com/source",
          type: "official",
        },
      ],
      evidence: [
        {
          itemId: "knowledge-1",
          claim: answer,
          status,
          confidence: 95,
          authorityScore:
            status === "VERIFIED" ? 95 : 20,
          corroborated:
            status === "VERIFIED",
          supportingSources:
            status === "VERIFIED" ? 2 : 0,
          conflictingSources:
            status === "DISPUTED" ? 2 : 0,
          reason:
            status === "VERIFIED"
              ? "Verified evidence."
              : "Test evidence.",
        },
      ],
      warnings:
        status === "DISPUTED"
          ? ["DISPUTED"]
          : status === "STALE"
            ? ["STALE"]
            : status === "UNVERIFIED"
              ? ["UNVERIFIED"]
              : status === "REJECTED"
                ? ["REJECTED"]
                : [],
      explanation: `Test ${status} trusted answer.`,
    },
    status,
    ...overrides,
  };
}

function makeNoMatchResult(
  overrides: Partial<KnowledgeQueryResult> = {},
): KnowledgeQueryResult {
  return {
    query: "unknown query",
    matchedItems: 0,
    candidates: [],
    trustedAnswer: null,
    status: "NO_MATCH",
    ...overrides,
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

async function testVerifiedKnowledge() {
  const service = new AgentKnowledgeService(
    new FakeKnowledgeQuery(
      makeResult(
        "VERIFIED",
        "The verified answer.",
      ),
    ),
  );

  const context =
    await service.getContext(
      "best market",
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
    context.answer,
    "The verified answer.",
  );
  assert.equal(
    context.canUseAsTrustedContext,
    true,
  );
  assert.equal(
    context.confidence,
    95,
  );
  assert.equal(
    context.sources.length,
    1,
  );
  assert.equal(
    context.evidence.length,
    1,
  );
}

async function testUnverifiedKnowledge() {
  const service = new AgentKnowledgeService(
    new FakeKnowledgeQuery(
      makeResult(
        "UNVERIFIED",
        "An unverified answer.",
      ),
    ),
  );

  const context =
    await service.getContext(
      "best market",
    );

  assert.equal(
    context.availability,
    "WARNING",
  );
  assert.equal(
    context.status,
    "UNVERIFIED",
  );
  assert.equal(
    context.answer,
    "An unverified answer.",
  );
  assert.equal(
    context.canUseAsTrustedContext,
    false,
  );
  assert.deepEqual(
    context.warnings,
    ["UNVERIFIED"],
  );
}

async function testStaleKnowledge() {
  const service = new AgentKnowledgeService(
    new FakeKnowledgeQuery(
      makeResult(
        "STALE",
        "A stale answer.",
      ),
    ),
  );

  const context =
    await service.getContext(
      "best market",
    );

  assert.equal(
    context.availability,
    "WARNING",
  );
  assert.equal(
    context.status,
    "STALE",
  );
  assert.equal(
    context.canUseAsTrustedContext,
    false,
  );
  assert.deepEqual(
    context.warnings,
    ["STALE"],
  );
}

async function testDisputedKnowledge() {
  const service = new AgentKnowledgeService(
    new FakeKnowledgeQuery(
      makeResult(
        "DISPUTED",
        "A disputed answer.",
      ),
    ),
  );

  const context =
    await service.getContext(
      "best market",
    );

  assert.equal(
    context.availability,
    "BLOCKED",
  );
  assert.equal(
    context.status,
    "DISPUTED",
  );
  assert.equal(
    context.answer,
    null,
  );
  assert.equal(
    context.canUseAsTrustedContext,
    false,
  );
  assert.equal(
    context.blockReason,
    "DISPUTED",
  );
  assert.deepEqual(
    context.warnings,
    ["DISPUTED"],
  );
}

async function testRejectedKnowledge() {
  const service = new AgentKnowledgeService(
    new FakeKnowledgeQuery(
      makeResult(
        "REJECTED",
        "A rejected answer.",
      ),
    ),
  );

  const context =
    await service.getContext(
      "best market",
    );

  assert.equal(
    context.availability,
    "BLOCKED",
  );
  assert.equal(
    context.status,
    "REJECTED",
  );
  assert.equal(
    context.answer,
    null,
  );
  assert.equal(
    context.confidence,
    0,
  );
  assert.equal(
    context.canUseAsTrustedContext,
    false,
  );
  assert.equal(
    context.blockReason,
    "REJECTED",
  );
  assert.deepEqual(
    context.warnings,
    ["REJECTED"],
  );
}

async function testNoMatch() {
  const service = new AgentKnowledgeService(
    new FakeKnowledgeQuery(
      makeNoMatchResult(),
    ),
  );

  const context =
    await service.getContext(
      "unknown query",
    );

  assert.equal(
    context.availability,
    "NO_MATCH",
  );
  assert.equal(
    context.status,
    "NO_MATCH",
  );
  assert.equal(
    context.answer,
    null,
  );
  assert.equal(
    context.confidence,
    0,
  );
  assert.equal(
    context.canUseAsTrustedContext,
    false,
  );
  assert.equal(
    context.blockReason,
    "NO_MATCH",
  );
  assert.equal(
    context.sources.length,
    0,
  );
  assert.equal(
    context.evidence.length,
    0,
  );
}

async function testNoMatchWithCandidates() {
  const candidate =
    {} as KnowledgeQueryCandidate;

  const service = new AgentKnowledgeService(
    new FakeKnowledgeQuery(
      makeNoMatchResult({
        matchedItems: 1,
        candidates: [candidate],
      }),
    ),
  );

  const context =
    await service.getContext(
      "unknown query",
    );

  assert.equal(
    context.availability,
    "NO_MATCH",
  );
  assert.equal(
    context.candidates.length,
    1,
  );
}

async function testEmptyQuery() {
  let called = false;

  const knowledge: KnowledgeQueryPort = {
    async query() {
      called = true;
      throw new Error(
        "Empty queries must not reach Knowledge Layer.",
      );
    },
  };

  const service =
    new AgentKnowledgeService(
      knowledge,
    );

  const context =
    await service.getContext("   ");

  assert.equal(
    called,
    false,
  );
  assert.equal(
    context.availability,
    "NO_MATCH",
  );
  assert.equal(
    context.status,
    "NO_MATCH",
  );
}

async function run() {
  await testVerifiedKnowledge();
  console.log(
    "✓ verified knowledge is available as trusted context",
  );

  await testUnverifiedKnowledge();
  console.log(
    "✓ unverified knowledge becomes a warning",
  );

  await testStaleKnowledge();
  console.log(
    "✓ stale knowledge becomes a warning",
  );

  await testDisputedKnowledge();
  console.log(
    "✓ disputed knowledge is blocked",
  );

  await testRejectedKnowledge();
  console.log(
    "✓ rejected knowledge is blocked",
  );

  await testNoMatch();
  console.log(
    "✓ no-match state is explicit",
  );

  await testNoMatchWithCandidates();
  console.log(
    "✓ no-match preserves candidate metadata",
  );

  await testEmptyQuery();
  console.log(
    "✓ empty queries are rejected before retrieval",
  );

  console.log(
    "\nv3.8 agent knowledge layer tests passed.",
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
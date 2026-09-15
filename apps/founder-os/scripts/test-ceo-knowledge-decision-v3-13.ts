import assert from "node:assert/strict";

import {
  detectStrategicSignal,
  buildCEOUserPrompt,
  type StrategicSignal,
} from "../lib/agents/ceo";

import {
  KnowledgeDecisionService,
} from "../lib/agents/knowledge/decision/knowledgeDecisionService";

import type {
  AgentKnowledgeContext,
} from "../lib/agents/knowledge/types";

const signal: StrategicSignal = {
  constraint: "demand",
  confidence: 92,
  evidence: [
    "The founder reports difficulty acquiring customers.",
  ],
};

function makeKnowledge(
  overrides: Partial<AgentKnowledgeContext> = {},
): AgentKnowledgeContext {
  return {
    query: "pipeline comercial",
    availability: "AVAILABLE",
    status: "VERIFIED",
    answer:
      "La empresa tiene dificultades para conseguir nuevos clientes.",
    confidence: 94,
    canUseAsTrustedContext: true,
    matchedItems: 1,
    sources: [
      {
        title: "Business Growth Report",
        publisher: "Verified Research",
        url: "https://example.com/business-growth-report",
        type: "research",
      },
    ],
    evidence: [
      {
        itemId: "knowledge-001",
        claim:
          "La empresa tiene dificultades para conseguir nuevos clientes.",
        status: "VERIFIED",
        confidence: 94,
        authorityScore: 91,
        corroborated: true,
        supportingSources: 2,
        conflictingSources: 0,
        reason:
          "La afirmación está respaldada por fuentes verificadas y corroboradas.",
      },
    ],
    candidates: [],
    warnings: [],
    explanation:
      "Verified knowledge is available and can be used as trusted agent context.",
    ...overrides,
  };
}

function testVerifiedBecomesFact(): void {
  const context = makeKnowledge();

  const decision =
    new KnowledgeDecisionService().createContext(
      context,
    );

  assert.equal(
    decision.classification,
    "FACT",
  );

  assert.equal(
    decision.canUseAsTrustedContext,
    true,
  );

  assert.equal(
    decision.facts.length,
    1,
  );

  assert.match(
    decision.facts[0],
    /dificultades para conseguir nuevos clientes/,
  );

  console.log(
    "✓ VERIFIED knowledge is classified as FACT",
  );
}

function testBlockedKnowledgeBecomesUnknown(): void {
  const statuses = [
    "UNVERIFIED",
    "STALE",
    "DISPUTED",
    "REJECTED",
  ] as const;

  for (const status of statuses) {
    const decision =
      new KnowledgeDecisionService().createContext(
        makeKnowledge({
          status,
          availability:
            status === "DISPUTED" ||
            status === "REJECTED"
              ? "BLOCKED"
              : "WARNING",
          canUseAsTrustedContext: false,
        }),
      );

    assert.equal(
      decision.classification,
      "UNKNOWN",
    );

    assert.equal(
      decision.canUseAsTrustedContext,
      false,
    );

    assert.equal(
      decision.facts.length,
      0,
    );

    console.log(
      `✓ ${status} knowledge becomes UNKNOWN`,
    );
  }
}

function testNoMatchBecomesUnknown(): void {
  const decision =
    new KnowledgeDecisionService().createContext(
      makeKnowledge({
        availability: "NO_MATCH",
        status: "NO_MATCH",
        answer: null,
        confidence: 0,
        canUseAsTrustedContext: false,
        sources: [],
        evidence: [],
        warnings: [],
        candidates: [],
        blockReason: "NO_MATCH",
      }),
    );

  assert.equal(
    decision.classification,
    "UNKNOWN",
  );

  assert.equal(
    decision.facts.length,
    0,
  );

  assert.equal(
    decision.unknowns.length,
    1,
  );

  console.log(
    "✓ NO_MATCH knowledge becomes UNKNOWN",
  );
}

function testCEOSignalUsesOnlyFacts(): void {
  const trusted = makeKnowledge();

  const trustedSignal =
    detectStrategicSignal(
      "¿Cuál debería ser nuestra prioridad estratégica?",
      {},
      trusted,
    );

  assert.equal(
    trustedSignal.constraint,
    "demand",
  );

  const blocked =
    makeKnowledge({
      status: "DISPUTED",
      availability: "BLOCKED",
      canUseAsTrustedContext: false,
    });

  const blockedSignal =
    detectStrategicSignal(
      "¿Cuál debería ser nuestra prioridad estratégica?",
      {},
      blocked,
    );

  assert.notEqual(
    blockedSignal.constraint,
    "demand",
  );

  console.log(
    "✓ CEO strategic signal consumes only FACT knowledge",
  );
}

function testPromptDeclaresDecisionContext(): void {
  const prompt =
    buildCEOUserPrompt(
      "¿Cuál debería ser nuestra prioridad estratégica?",
      {},
      makeKnowledge(),
      signal,
    );

  assert.match(
    prompt,
    /KNOWLEDGE DECISION CONTEXT/,
  );

  assert.match(
    prompt,
    /classification=FACT/,
  );

  assert.match(
    prompt,
    /status=VERIFIED/,
  );

  assert.match(
    prompt,
    /confidence=94/,
  );

  assert.match(
    prompt,
    /dificultades para conseguir nuevos clientes/,
  );

  const blockedPrompt =
    buildCEOUserPrompt(
      "¿Cuál debería ser nuestra prioridad estratégica?",
      {},
      makeKnowledge({
        status: "DISPUTED",
        availability: "BLOCKED",
        canUseAsTrustedContext: false,
      }),
      signal,
    );

  assert.match(
    blockedPrompt,
    /classification=UNKNOWN/,
  );

  assert.doesNotMatch(
    blockedPrompt,
    /classification=FACT/,
  );

  console.log(
    "✓ CEO prompt exposes decision classification without leaking blocked facts",
  );
}

testVerifiedBecomesFact();
testBlockedKnowledgeBecomesUnknown();
testNoMatchBecomesUnknown();
testCEOSignalUsesOnlyFacts();
testPromptDeclaresDecisionContext();

console.log(
  "\n🎉 CEO Knowledge Decision v3.13 test passed.",
);

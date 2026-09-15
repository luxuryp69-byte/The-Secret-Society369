import assert from "node:assert/strict";

import { buildCEOUserPrompt } from "../lib/agents/ceo";
import type { AgentKnowledgeContext } from "../lib/agents/knowledge/types";

const signal = {
  constraint: "demand" as const,
  confidence: 90,
  evidence: [
    "El contexto indica una restricción de demanda o adquisición.",
  ],
};

function makeKnowledgeContext(
  overrides: Partial<AgentKnowledgeContext> = {},
): AgentKnowledgeContext {
  return {
    query: "prioridad estratégica",
    availability: "AVAILABLE",
    status: "VERIFIED",
    answer:
      "TRUSTED_KNOWLEDGE_PIPELINE_TEST: el pipeline comercial está casi vacío.",
    confidence: 94,
    canUseAsTrustedContext: true,
    matchedItems: 1,
    sources: [],
    evidence: [],
    candidates: [],
    warnings: [],
    explanation:
      "Verified knowledge is available and can be used as trusted agent context.",
    ...overrides,
  };
}

function buildPrompt(knowledge: unknown): string {
  return buildCEOUserPrompt(
    "¿Cuál debería ser nuestra prioridad estratégica?",
    {},
    knowledge,
    signal,
  );
}

function testVerifiedKnowledgeIsIncluded(): void {
  const prompt = buildPrompt(
    makeKnowledgeContext(),
  );

  assert.match(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  console.log(
    "✓ VERIFIED knowledge is included in CEO prompt",
  );
}

function testUnverifiedKnowledgeIsExcluded(): void {
  const prompt = buildPrompt(
    makeKnowledgeContext({
      status: "UNVERIFIED",
      availability: "WARNING",
      canUseAsTrustedContext: false,
    }),
  );

  assert.doesNotMatch(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  console.log(
    "✓ UNVERIFIED knowledge is excluded from CEO prompt",
  );
}

function testStaleKnowledgeIsExcluded(): void {
  const prompt = buildPrompt(
    makeKnowledgeContext({
      status: "STALE",
      availability: "WARNING",
      canUseAsTrustedContext: false,
    }),
  );

  assert.doesNotMatch(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  console.log(
    "✓ STALE knowledge is excluded from CEO prompt",
  );
}

function testDisputedKnowledgeIsExcluded(): void {
  const prompt = buildPrompt(
    makeKnowledgeContext({
      status: "DISPUTED",
      availability: "BLOCKED",
      canUseAsTrustedContext: false,
      answer:
        "TRUSTED_KNOWLEDGE_PIPELINE_TEST: disputed information",
    }),
  );

  assert.doesNotMatch(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  console.log(
    "✓ DISPUTED knowledge is excluded from CEO prompt",
  );
}

function testRejectedKnowledgeIsExcluded(): void {
  const prompt = buildPrompt(
    makeKnowledgeContext({
      status: "REJECTED",
      availability: "BLOCKED",
      canUseAsTrustedContext: false,
      answer:
        "TRUSTED_KNOWLEDGE_PIPELINE_TEST: rejected information",
    }),
  );

  assert.doesNotMatch(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  console.log(
    "✓ REJECTED knowledge is excluded from CEO prompt",
  );
}

function testNoMatchKnowledgeIsExcluded(): void {
  const prompt = buildPrompt(
    makeKnowledgeContext({
      status: "NO_MATCH",
      availability: "NO_MATCH",
      canUseAsTrustedContext: false,
      answer:
        "TRUSTED_KNOWLEDGE_PIPELINE_TEST: no-match information",
    }),
  );

  assert.doesNotMatch(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  console.log(
    "✓ NO_MATCH knowledge is excluded from CEO prompt",
  );
}

function main(): void {
  testVerifiedKnowledgeIsIncluded();
  testUnverifiedKnowledgeIsExcluded();
  testStaleKnowledgeIsExcluded();
  testDisputedKnowledgeIsExcluded();
  testRejectedKnowledgeIsExcluded();
  testNoMatchKnowledgeIsExcluded();

  console.log(
    "\n🎉 CEO Knowledge Prompt v3.11 test passed.",
  );
}

main();

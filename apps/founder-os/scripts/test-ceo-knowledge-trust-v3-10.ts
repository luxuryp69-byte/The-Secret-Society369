import assert from "node:assert/strict";

import { detectStrategicSignal } from "../lib/agents/ceo";

function makeKnowledgeContext(
  overrides: Record<string, unknown> = {},
) {
  return {
    query: "prioridad estratégica",
    availability: "AVAILABLE",
    status: "VERIFIED",
    answer:
      "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.",
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

function assertDemandSignal(
  knowledge: unknown,
): void {
  const signal = detectStrategicSignal(
    "¿Cuál debería ser nuestra prioridad estratégica?",
    {},
    knowledge,
  );

  assert.equal(
    signal.constraint,
    "demand",
  );
}

function assertNoDemandSignal(
  knowledge: unknown,
): void {
  const signal = detectStrategicSignal(
    "¿Cuál debería ser nuestra prioridad estratégica?",
    {},
    knowledge,
  );

  assert.notEqual(
    signal.constraint,
    "demand",
  );
}

function testVerifiedKnowledgeIsTrusted(): void {
  assertDemandSignal(
    makeKnowledgeContext(),
  );

  console.log(
    "✓ VERIFIED knowledge can influence CEO strategic signal",
  );
}

function testUnverifiedKnowledgeIsNotTrusted(): void {
  assertNoDemandSignal(
    makeKnowledgeContext({
      availability: "WARNING",
      status: "UNVERIFIED",
      canUseAsTrustedContext: false,
    }),
  );

  console.log(
    "✓ UNVERIFIED knowledge cannot influence CEO strategic signal",
  );
}

function testStaleKnowledgeIsNotTrusted(): void {
  assertNoDemandSignal(
    makeKnowledgeContext({
      availability: "WARNING",
      status: "STALE",
      canUseAsTrustedContext: false,
    }),
  );

  console.log(
    "✓ STALE knowledge cannot influence CEO strategic signal",
  );
}

function testDisputedKnowledgeIsNotTrusted(): void {
  assertNoDemandSignal(
    makeKnowledgeContext({
      availability: "BLOCKED",
      status: "DISPUTED",
      canUseAsTrustedContext: false,
      answer: null,
    }),
  );

  console.log(
    "✓ DISPUTED knowledge cannot influence CEO strategic signal",
  );
}

function testRejectedKnowledgeIsNotTrusted(): void {
  assertNoDemandSignal(
    makeKnowledgeContext({
      availability: "BLOCKED",
      status: "REJECTED",
      canUseAsTrustedContext: false,
      answer: null,
    }),
  );

  console.log(
    "✓ REJECTED knowledge cannot influence CEO strategic signal",
  );
}

function testNoMatchIsNotTrusted(): void {
  assertNoDemandSignal(
    makeKnowledgeContext({
      availability: "NO_MATCH",
      status: "NO_MATCH",
      canUseAsTrustedContext: false,
      answer: null,
    }),
  );

  console.log(
    "✓ NO_MATCH knowledge cannot influence CEO strategic signal",
  );
}

function testDirectMessageStillWins(): void {
  const signal = detectStrategicSignal(
    "Estamos perdiendo muchos clientes y el churn ha aumentado.",
    {},
    makeKnowledgeContext({
      answer:
        "La empresa tiene un pipeline comercial casi vacío.",
    }),
  );

  assert.equal(
    signal.constraint,
    "retention",
  );

  console.log(
    "✓ Direct CEO message signals retain priority",
  );
}

function main(): void {
  testVerifiedKnowledgeIsTrusted();
  testUnverifiedKnowledgeIsNotTrusted();
  testStaleKnowledgeIsNotTrusted();
  testDisputedKnowledgeIsNotTrusted();
  testRejectedKnowledgeIsNotTrusted();
  testNoMatchIsNotTrusted();
  testDirectMessageStillWins();

  console.log(
    "v3.10 CEO knowledge trust tests passed.",
  );
}

main();

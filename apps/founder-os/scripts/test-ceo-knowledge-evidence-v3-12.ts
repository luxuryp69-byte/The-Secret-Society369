import assert from "node:assert/strict";
import {
  buildCEOUserPrompt,
  type StrategicSignal,
} from "../lib/agents/ceo";
import type { AgentKnowledgeContext } from "../lib/agents/knowledge/types";

const signal: StrategicSignal = {
  constraint: "demand",
  confidence: 92,
  evidence: [
    "The founder reports difficulty acquiring customers.",
  ],
};

function makeKnowledgeContext(
  overrides: Partial<AgentKnowledgeContext> = {},
): AgentKnowledgeContext {
  return {
    query: "pipeline comercial",
    availability: "AVAILABLE",
    status: "VERIFIED",
    answer:
      "TRUSTED_KNOWLEDGE_PIPELINE_TEST: La empresa tiene dificultades para conseguir nuevos clientes.",
    confidence: 94,
    canUseAsTrustedContext: true,
    matchedItems: 1,
    sources: [
      {
        title: "Business Growth Report",
        publisher: "Verified Research",
        url: "https://example.com/business-growth-report",
        type: "research",
        publishedAt: "2026-08-01",
        fetchedAt: "2026-08-05",
        verifiedAt: "2026-08-06",
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

function buildPrompt(
  knowledge: AgentKnowledgeContext,
): string {
  return buildCEOUserPrompt(
    "¿Cuál debe ser nuestra prioridad estratégica?",
    {
      founder: "Founder OS test context",
    },
    knowledge,
    signal,
  );
}

function assertTrustedEvidencePresent(): void {
  const prompt = buildPrompt(makeKnowledgeContext());

  assert.match(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  assert.match(
    prompt,
    /KNOWLEDGE SOURCES/,
  );

  assert.match(
    prompt,
    /Business Growth Report/,
  );

  assert.match(
    prompt,
    /Verified Research/,
  );

  assert.match(
    prompt,
    /https:\/\/example\.com\/business-growth-report/,
  );

  assert.match(
    prompt,
    /KNOWLEDGE EVIDENCE/,
  );

  assert.match(
    prompt,
    /knowledge-001|dificultades para conseguir nuevos clientes/,
  );

  assert.match(
    prompt,
    /authorityScore=91/,
  );

  assert.match(
    prompt,
    /corroborated=true/,
  );

  assert.match(
    prompt,
    /supportingSources=2/,
  );

  console.log(
    "✓ VERIFIED knowledge includes trusted answer, sources, and evidence",
  );
}

function assertBlockedKnowledgeDoesNotLeak(): void {
  const blockedStatuses = [
    "UNVERIFIED",
    "STALE",
    "DISPUTED",
    "REJECTED",
  ] as const;

  for (const status of blockedStatuses) {
    const prompt = buildPrompt(
      makeKnowledgeContext({
        availability:
          status === "DISPUTED" || status === "REJECTED"
            ? "BLOCKED"
            : "WARNING",
        status,
        canUseAsTrustedContext: false,
      }),
    );

    assert.doesNotMatch(
      prompt,
      /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
    );

    assert.doesNotMatch(
      prompt,
      /Business Growth Report/,
    );

    assert.doesNotMatch(
      prompt,
      /knowledge-001/,
    );

    assert.doesNotMatch(
      prompt,
      /authorityScore=91/,
    );

    console.log(
      `✓ ${status} knowledge does not leak into CEO prompt`,
    );
  }
}

function assertNoMatchDoesNotLeak(): void {
  const prompt = buildPrompt(
    makeKnowledgeContext({
      availability: "NO_MATCH",
      status: "NO_MATCH",
      answer: null,
      confidence: 0,
      canUseAsTrustedContext: false,
      matchedItems: 0,
      sources: [],
      evidence: [],
      candidates: [],
      warnings: [],
      blockReason: "NO_MATCH",
    }),
  );

  assert.doesNotMatch(
    prompt,
    /TRUSTED_KNOWLEDGE_PIPELINE_TEST/,
  );

  assert.doesNotMatch(
    prompt,
    /Business Growth Report/,
  );

  assert.doesNotMatch(
    prompt,
    /knowledge-001/,
  );

  console.log(
    "✓ NO_MATCH knowledge does not leak into CEO prompt",
  );
}

function assertWholeObjectIsNotSerialized(): void {
  const prompt = buildPrompt(makeKnowledgeContext());

  assert.doesNotMatch(
    prompt,
    /"canUseAsTrustedContext"\s*:/,
  );

  assert.doesNotMatch(
    prompt,
    /"matchedItems"\s*:/,
  );

  assert.doesNotMatch(
    prompt,
    /"candidates"\s*:/,
  );

  assert.doesNotMatch(
    prompt,
    /"warnings"\s*:/,
  );

  console.log(
    "✓ Agent knowledge context is formatted selectively instead of serialized wholesale",
  );
}

assertTrustedEvidencePresent();
assertBlockedKnowledgeDoesNotLeak();
assertNoMatchDoesNotLeak();
assertWholeObjectIsNotSerialized();

console.log(
  "\n🎉 CEO Knowledge Evidence v3.12 test passed.",
);

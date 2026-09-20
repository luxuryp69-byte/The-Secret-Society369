import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildDecisionTrace,
} from "../../lib/agents/decisionTrace/buildDecisionTrace";

import type {
  DecisionTraceBuildInput,
  TraceEvidenceReference,
} from "../../lib/agents/decisionTrace/types";

import type {
  AgentKnowledgeDecisionContext,
  KnowledgeDecisionClassification,
  KnowledgeDecisionValidationResult,
} from "../../lib/agents/knowledge/decision/types";

const SOURCE_URL =
  "https://example.com/verified-demand";

const CLAIM =
  "La empresa tiene dificultades para conseguir nuevos clientes.";

const ITEM_ID =
  "knowledge-demand-v3174";

const authoritativeEvidence: TraceEvidenceReference = {
  itemId: ITEM_ID,
  claim: CLAIM,
  sourceUrl: SOURCE_URL,
  sourceUrls: [SOURCE_URL],
  status: "VERIFIED",
  confidence: 94,
  authorityScore: 90,
  corroborated: true,
  supportingSources: 2,
  conflictingSources: 0,
  reason: "Evidence verified by Knowledge Layer.",
};

function makeKnowledge(): AgentKnowledgeDecisionContext {
  return {
    query: "restricción comercial",
    availability: "AVAILABLE",
    status: "VERIFIED",
    classification: "FACT",
    answer: CLAIM,
    confidence: 94,
    knowledgeConfidence: 94,
    canUseAsTrustedContext: true,
    sources: [
      {
        title: "Verified demand report",
        publisher: "Founder OS Test Research",
        url: SOURCE_URL,
        type: "research",
      },
    ],
    evidence: [
      {
        itemId: ITEM_ID,
        claim: CLAIM,
        status: "VERIFIED",
        confidence: 94,
        authorityScore: 90,
        corroborated: true,
        supportingSources: 2,
        conflictingSources: 0,
        reason: "Evidence verified by Knowledge Layer.",
        sourceUrls: [SOURCE_URL],
      },
    ],
    warnings: [],
    facts: [CLAIM],
    inferences: [],
    assumptions: [],
    unknowns: [],
    explanation: "Verified knowledge.",
  };
}

function makeInput(
  acceptedEvidence: TraceEvidenceReference[],
  validation: KnowledgeDecisionValidationResult = {
    valid: true,
    classification: "FACT",
    reason: "Validated by Knowledge Layer.",
  },
): DecisionTraceBuildInput {
  return {
    traceId: "trace-v3174-test",
    createdAt: "2026-09-20T12:00:00.000Z",
    input: {
      message: "¿Cuál debería ser nuestra prioridad?",
    },
    strategicSignal: {
      constraint: "demand",
      evidence: [
        "El pipeline comercial está casi vacío.",
      ],
      confidence: 90,
    },
    knowledge: makeKnowledge(),
    decision: {
      output: {
        primaryPriority: "demand and acquisition",
        why: "La evidencia disponible indica una restricción de demanda.",
        plan: [
          "Definir prospectos prioritarios.",
          "Ejecutar contacto comercial diario.",
          "Medir las oportunidades generadas.",
        ],
        successCriteria: [
          "Generar 30 conversaciones cualificadas.",
          "Crear 10 oportunidades nuevas.",
        ],
        whatNotToPrioritize:
          "No priorizar fundraising durante este ciclo.",
      },
      metadata: {
        resolution: "LLM",
        classification: validation.classification,
        acceptedEvidence,
        validation,
      },
    },
  };
}

describe("Founder OS v3.17.4 — DecisionTrace grounding", () => {
  it("includes evidence only when validation is valid", () => {
    const trace = buildDecisionTrace(
      makeInput([authoritativeEvidence]),
    );

    expect(trace.decision.acceptedEvidence).toEqual([
      authoritativeEvidence,
    ]);
  });

  it("rejects an evidence reference with an unknown itemId", () => {
    const fake = {
      ...authoritativeEvidence,
      itemId: "fake-item-id",
    };

    const trace = buildDecisionTrace(
      makeInput([fake]),
    );

    expect(trace.decision.acceptedEvidence).toEqual([]);
  });

  it("rejects an evidence reference with a mismatched claim", () => {
    const fake = {
      ...authoritativeEvidence,
      claim: "Claim inventado por el LLM.",
    };

    const trace = buildDecisionTrace(
      makeInput([fake]),
    );

    expect(trace.decision.acceptedEvidence).toEqual([]);
  });

  it("rejects an evidence reference with a mismatched source URL", () => {
    const fake = {
      ...authoritativeEvidence,
      sourceUrl: "https://example.com/fake-source",
      sourceUrls: [
        "https://example.com/fake-source",
      ],
    };

    const trace = buildDecisionTrace(
      makeInput([fake]),
    );

    expect(trace.decision.acceptedEvidence).toEqual([]);
  });

  it("rejects an evidence reference with a mismatched status", () => {
    const fake = {
      ...authoritativeEvidence,
      status: "UNVERIFIED" as const,
    };

    const trace = buildDecisionTrace(
      makeInput([fake]),
    );

    expect(trace.decision.acceptedEvidence).toEqual([]);
  });

  it("rejects accepted evidence when validation is false", () => {
    const trace = buildDecisionTrace(
      makeInput(
        [authoritativeEvidence],
        {
          valid: false,
          classification: "UNKNOWN" as KnowledgeDecisionClassification,
          reason: "Knowledge boundary violation.",
        },
      ),
    );

    expect(trace.decision.acceptedEvidence).toEqual([]);
  });

  it("never promotes LLM prose into evidence", () => {
    const input = makeInput([]);

    input.decision.output.why =
      `The source ${SOURCE_URL} proves that ${CLAIM}`;

    const trace = buildDecisionTrace(input);

    expect(trace.decision.acceptedEvidence).toEqual([]);
  });

  it("preserves authoritative evidence instead of copying candidate metadata", () => {
    const candidate = {
      ...authoritativeEvidence,
      confidence: 1,
      authorityScore: 1,
      reason: "LLM-generated reason.",
    };

    const trace = buildDecisionTrace(
      makeInput([candidate]),
    );

    expect(trace.decision.acceptedEvidence).toEqual([
      authoritativeEvidence,
    ]);
  });

  it("keeps inference classification separate from evidence grounding", () => {
    const trace = buildDecisionTrace(
      makeInput(
        [authoritativeEvidence],
        {
          valid: true,
          classification: "INFERENCE" as KnowledgeDecisionClassification,
          reason: "Inference explicitly validated.",
        },
      ),
    );

    expect(trace.decision.classification).toBe(
      "INFERENCE",
    );

    expect(
      trace.decision.acceptedEvidence,
    ).toEqual([authoritativeEvidence]);
  });

  it("does not allow an invalid evidence object to survive alongside valid evidence", () => {
    const fake = {
      ...authoritativeEvidence,
      itemId: "fake-item-id",
    };

    const trace = buildDecisionTrace(
      makeInput([
        authoritativeEvidence,
        fake,
      ]),
    );

    expect(
      trace.decision.acceptedEvidence,
    ).toEqual([authoritativeEvidence]);
  });
});

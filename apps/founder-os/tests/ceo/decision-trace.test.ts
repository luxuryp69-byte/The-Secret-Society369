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
} from "../../lib/agents/knowledge/decision/types";
import type {
  KnowledgeVerificationStatus,
} from "../../lib/knowledge/types";

const SOURCE_URL =
  "https://example.com/verified-demand";
const CLAIM =
  "La empresa tiene dificultades para conseguir nuevos clientes.";

const evidence: TraceEvidenceReference = {
  itemId: "knowledge-demand-v317",
  claim: CLAIM,
  sourceUrl: SOURCE_URL,
  sourceUrls: [SOURCE_URL],
  status: "VERIFIED",
  confidence: 94,
  authorityScore: 90,
  corroborated: true,
  supportingSources: 2,
  conflictingSources: 0,
  reason: "La evidencia está verificada y corroborada.",
};

function makeKnowledge(
  status: KnowledgeVerificationStatus | "NO_MATCH" = "VERIFIED",
  overrides: Partial<AgentKnowledgeDecisionContext> = {},
): AgentKnowledgeDecisionContext {
  const trusted = status === "VERIFIED";

  return {
    query: "restricción comercial",
    availability: trusted ? "AVAILABLE" : "WARNING",
    status,
    classification: trusted ? "FACT" : "UNKNOWN",
    canUseAsTrustedContext: trusted,
    answer: trusted ? CLAIM : null,
    facts: trusted ? [CLAIM] : [],
    inferences: [],
    assumptions: [],
    unknowns: trusted ? [] : ["La evidencia no es suficientemente confiable."],
    confidence: trusted ? 94 : 20,
    knowledgeConfidence: trusted ? 94 : 20,
    sources: trusted
      ? [
          {
            title: "Verified demand report",
            publisher: "Founder OS Test Research",
            url: SOURCE_URL,
            type: "research",
          },
        ]
      : [],
    evidence: trusted
      ? [
          {
            itemId: evidence.itemId,
            claim: evidence.claim,
            sourceUrls: [...evidence.sourceUrls],
            status: evidence.status,
            confidence: evidence.confidence,
            authorityScore: evidence.authorityScore,
            corroborated: evidence.corroborated,
            supportingSources: evidence.supportingSources,
            conflictingSources: evidence.conflictingSources,
            reason: evidence.reason,
          },
        ]
      : [],
    warnings: trusted ? [] : [status],
    explanation: trusted
      ? "Verified knowledge is available."
      : `Knowledge status ${status} is not trusted.`,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<DecisionTraceBuildInput> = {},
): DecisionTraceBuildInput {
  const knowledge = makeKnowledge();

  return {
    traceId: "trace-v317-test-001",
    createdAt: "2026-09-17T12:00:00.000Z",
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
    knowledge,
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
        classification: "FACT",
        decisionConfidence: 72,
        acceptedEvidence: [evidence],
        validation: {
          valid: true,
          classification: "FACT",
          reason: "Metadata consistente con Knowledge Layer.",
        },
        inferences: [
          "La adquisición debería ser la prioridad del siguiente ciclo.",
        ],
        warnings: ["La prioridad requiere medición semanal."],
      },
    },
    excludedInformation: [
      {
        category: "SOURCE",
        reference: "https://example.com/unverified-source",
        reason: "La fuente no pertenece al contexto validado.",
      },
    ],
    ...overrides,
  };
}

describe("Founder OS v3.17.1 — Decision Trace base", () => {
  it("construye una trace válida con todos los datos", () => {
    const trace = buildDecisionTrace(makeInput());

    expect(trace.traceId).toBe("trace-v317-test-001");
    expect(trace.decision.output.primaryPriority).toBe(
      "demand and acquisition",
    );
    expect(trace.knowledge.evidence).toHaveLength(1);
    expect(trace.explanation.strategicConstraints).toEqual([
      "demand",
    ]);
  });

  it("preserva traceId", () => {
    expect(
      buildDecisionTrace(
        makeInput({ traceId: "custom-trace-id" }),
      ).traceId,
    ).toBe("custom-trace-id");
  });

  it("preserva createdAt", () => {
    expect(
      buildDecisionTrace(
        makeInput({ createdAt: "2030-01-01T00:00:00.000Z" }),
      ).createdAt,
    ).toBe("2030-01-01T00:00:00.000Z");
  });

  it("preserva input", () => {
    const input = makeInput();
    const trace = buildDecisionTrace(input);

    expect(trace.input).toEqual(input.input);
  });

  it("proyecta strategic signal", () => {
    const trace = buildDecisionTrace(makeInput());

    expect(trace.strategicSignal).toEqual({
      constraint: "demand",
      evidence: [
        "El pipeline comercial está casi vacío.",
      ],
      confidence: 90,
    });
  });

  it("proyecta knowledge status", () => {
    const trace = buildDecisionTrace(
      makeInput({
        knowledge: makeKnowledge("STALE"),
      }),
    );

    expect(trace.knowledge.status).toBe("STALE");
    expect(trace.knowledge.classification).toBe("UNKNOWN");
  });

  it("proyecta knowledge confidence", () => {
    const trace = buildDecisionTrace(
      makeInput({
        knowledge: makeKnowledge("VERIFIED", {
          knowledgeConfidence: 88,
        }),
      }),
    );

    expect(trace.knowledge.knowledgeConfidence).toBe(88);
    expect(trace.decision.knowledgeConfidence).toBe(88);
  });

  it("proyecta evidence", () => {
    const trace = buildDecisionTrace(makeInput());

    expect(trace.knowledge.evidence[0]).toMatchObject({
      itemId: evidence.itemId,
      claim: evidence.claim,
      sourceUrl: evidence.sourceUrl,
      status: "VERIFIED",
      confidence: 94,
    });
  });

  it("mantiene itemId, claim y sourceUrl asociados", () => {
    const trace = buildDecisionTrace(makeInput());
    const projected = trace.knowledge.evidence[0];

    expect(projected.itemId).toBe(evidence.itemId);
    expect(projected.claim).toBe(evidence.claim);
    expect(projected.sourceUrl).toBe(SOURCE_URL);
    expect(projected.sourceUrls).toEqual([SOURCE_URL]);
  });

  it("proyecta una decisión LLM", () => {
    const trace = buildDecisionTrace(makeInput());

    expect(trace.decision.resolution).toBe("LLM");
    expect(trace.decision.validation).toBeDefined();
    expect(trace.decision.validation?.valid).toBe(true);
    expect(trace.decision.acceptedEvidence).toHaveLength(1);
  });

  it("proyecta una decisión deterministic fallback", () => {
    const input = makeInput({
      decision: {
        output: makeInput().decision.output,
        metadata: {
          resolution: "DETERMINISTIC_FALLBACK",
          classification: "UNKNOWN",
          validation: {
            valid: false,
            classification: "UNKNOWN",
            reason: "Knowledge no confiable.",
          },
          fallbackReason: "Provider unavailable.",
        },
      },
    });

    const trace = buildDecisionTrace(input);

    expect(trace.decision.resolution).toBe(
      "DETERMINISTIC_FALLBACK",
    );
    expect(trace.decision.fallbackReason).toBe(
      "Provider unavailable.",
    );
  });

  it("mantiene decisionConfidence separada de knowledgeConfidence", () => {
    const trace = buildDecisionTrace(makeInput());

    expect(trace.decision.decisionConfidence).toBe(72);
    expect(trace.decision.knowledgeConfidence).toBe(94);
    expect(trace.decision.decisionConfidence).not.toBe(
      trace.decision.knowledgeConfidence,
    );
  });

  it("conserva UNKNOWN", () => {
    const trace = buildDecisionTrace(
      makeInput({
        knowledge: makeKnowledge("NO_MATCH", {
          availability: "NO_MATCH",
          classification: "UNKNOWN",
          knowledgeConfidence: 0,
          warnings: ["NO_MATCH"],
        }),
        decision: {
          output: makeInput().decision.output,
          metadata: {
            resolution: "DETERMINISTIC_FALLBACK",
            classification: "UNKNOWN",
            validation: {
              valid: true,
              classification: "UNKNOWN",
              reason: "No verified knowledge available.",
            },
          },
        },
      }),
    );

    expect(trace.knowledge.classification).toBe("UNKNOWN");
    expect(trace.decision.classification).toBe("UNKNOWN");
    expect(trace.knowledge.status).toBe("NO_MATCH");
  });

  it("conserva INFERENCE", () => {
    const trace = buildDecisionTrace(
      makeInput({
        knowledge: makeKnowledge("VERIFIED", {
          classification: "INFERENCE",
          facts: [],
          inferences: ["La adquisición parece prioritaria."],
        }),
        decision: {
          output: makeInput().decision.output,
          metadata: {
            resolution: "LLM",
            classification: "INFERENCE",
            decisionConfidence: 61,
            validation: {
              valid: true,
              classification: "INFERENCE",
              reason: "Inference explicitly labelled.",
            },
            inferences: ["La adquisición parece prioritaria."],
          },
        },
      }),
    );

    expect(trace.knowledge.classification).toBe("INFERENCE");
    expect(trace.decision.classification).toBe("INFERENCE");
    expect(trace.explanation.inferences).toContain(
      "La adquisición parece prioritaria.",
    );
  });

  it("conserva warnings", () => {
    const trace = buildDecisionTrace(makeInput());

    expect(trace.knowledge.warnings).toEqual([]);
    expect(trace.explanation.warnings).toContain(
      "La prioridad requiere medición semanal.",
    );
  });

  it("conserva excluded information", () => {
    const trace = buildDecisionTrace(makeInput());

    expect(trace.knowledge.excludedInformation).toEqual([
      {
        category: "SOURCE",
        reference: "https://example.com/unverified-source",
        reason: "La fuente no pertenece al contexto validado.",
      },
    ]);
    expect(trace.explanation.excludedInformation).toEqual(
      trace.knowledge.excludedInformation,
    );
  });

  it("conserva fallback reason", () => {
    const input = makeInput();
    input.decision.metadata = {
      ...input.decision.metadata,
      resolution: "DETERMINISTIC_FALLBACK",
      fallbackReason: "Salida JSON inválida.",
    };

    expect(
      buildDecisionTrace(input).decision.fallbackReason,
    ).toBe("Salida JSON inválida.");
  });

  it("es determinista para los mismos inputs", () => {
    const first = buildDecisionTrace(makeInput());
    const second = buildDecisionTrace(makeInput());

    expect(second).toEqual(first);
  });

  it("no modifica los input objects", () => {
    const input = makeInput();
    const original = structuredClone(input);

    buildDecisionTrace(input);

    expect(input).toEqual(original);
  });

  it("no comparte referencias mutables con los objetos fuente", () => {
    const input = makeInput();
    const trace = buildDecisionTrace(input);

    input.strategicSignal.evidence.push(
      "Mutación posterior no permitida.",
    );
    input.knowledge.facts.push(
      "Fact mutado fuera de la trace.",
    );
    input.knowledge.evidence[0].sourceUrls?.push(
      "https://example.com/mutated-source",
    );
    input.decision.output.plan[0] =
      "Mutación posterior no permitida.";

    expect(trace.strategicSignal.evidence).not.toContain(
      "Mutación posterior no permitida.",
    );
    expect(trace.explanation.facts).not.toContain(
      "Fact mutado fuera de la trace.",
    );
    expect(trace.knowledge.evidence[0].sourceUrls).toEqual([
      SOURCE_URL,
    ]);
    expect(trace.decision.output.plan[0]).toBe(
      "Definir prospectos prioritarios.",
    );
  });

  it.each([
    ["VERIFIED", "AVAILABLE", "FACT"],
    ["UNVERIFIED", "WARNING", "UNKNOWN"],
    ["STALE", "WARNING", "UNKNOWN"],
    ["DISPUTED", "BLOCKED", "UNKNOWN"],
    ["REJECTED", "BLOCKED", "UNKNOWN"],
    ["NO_MATCH", "NO_MATCH", "UNKNOWN"],
  ] as const)(
    "preserva status %s sin convertirlo",
    (status, availability, classification) => {
      const trace = buildDecisionTrace(
        makeInput({
          knowledge: makeKnowledge(status, {
            availability,
            classification,
            canUseAsTrustedContext:
              classification === "FACT",
            knowledgeConfidence:
              status === "NO_MATCH" ? 0 : 20,
            evidence:
              status === "VERIFIED"
                ? makeKnowledge("VERIFIED").evidence
                : [],
          }),
          decision: {
            output: makeInput().decision.output,
            metadata: {
              resolution: "DETERMINISTIC_FALLBACK",
              classification,
              validation: {
                valid: true,
                classification,
                reason: "Projected validated context.",
              },
            },
          },
        }),
      );

      expect(trace.knowledge.status).toBe(status);
      expect(trace.knowledge.availability).toBe(availability);
      expect(trace.knowledge.classification).toBe(
        classification,
      );
    },
  );
});

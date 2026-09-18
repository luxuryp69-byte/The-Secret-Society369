import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  DecisionTrace,
  DecisionTraceBuildInput,
} from "../../lib/agents/decisionTrace/types";
import type {
  AgentKnowledgeContext,
} from "../../lib/agents/knowledge/types";
import type {
  KnowledgeItem,
  KnowledgeVerificationStatus,
} from "../../lib/knowledge/types";

const traceCapture = vi.hoisted(() => ({
  inputs: [] as DecisionTraceBuildInput[],
  traces: [] as DecisionTrace[],
  throwOnBuild: false,
}));

vi.mock(
  "../../lib/agents/decisionTrace/buildDecisionTrace",
  async () => {
    const actual = await vi.importActual<
      typeof import(
        "../../lib/agents/decisionTrace/buildDecisionTrace"
      )
    >(
      "../../lib/agents/decisionTrace/buildDecisionTrace",
    );

    return {
      ...actual,
      buildDecisionTrace: (
        input: DecisionTraceBuildInput,
      ) => {
        traceCapture.inputs.push(input);

        if (traceCapture.throwOnBuild) {
          throw new Error("trace construction failure");
        }

        const trace = actual.buildDecisionTrace(input);

        traceCapture.traces.push(trace);

        return trace;
      },
    };
  },
);

vi.mock("../../lib/ai/ollama", () => ({
  askFast: vi.fn(),
}));

import { ceoAgent } from "../../lib/agents/ceo";
import { askFast } from "../../lib/ai/ollama";

const askFastMock = vi.mocked(askFast);

const SOURCE_URL =
  "https://example.com/verified-demand";
const CLAIM =
  "La empresa tiene dificultades para conseguir nuevos clientes.";
const MESSAGE =
  "¿Cuál debería ser nuestra prioridad estratégica?";

const originalDecisionMode =
  process.env.FOUNDER_OS_CEO_DECISION_MODE;

function makeKnowledge(
  status: KnowledgeVerificationStatus | "NO_MATCH",
): AgentKnowledgeContext {
  const hasKnowledge = status !== "NO_MATCH";
  const itemStatus: KnowledgeVerificationStatus =
    hasKnowledge ? status : "UNVERIFIED";
  const availability =
    status === "VERIFIED"
      ? "AVAILABLE"
      : status === "DISPUTED" || status === "REJECTED"
        ? "BLOCKED"
        : status === "NO_MATCH"
          ? "NO_MATCH"
          : "WARNING";

  const item: KnowledgeItem = {
    id: "knowledge-demand-v3172",
    claim: CLAIM,
    source: {
      title: "Verified demand report",
      publisher: "Founder OS Test Research",
      url: SOURCE_URL,
      type: "research",
    },
    topic: "commercial demand",
    confidence: status === "VERIFIED" ? 94 : 30,
    verificationStatus: itemStatus,
    tags: ["demand"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };

  return {
    query: "restricción comercial",
    availability,
    status,
    answer: status === "VERIFIED" ? CLAIM : null,
    confidence: status === "VERIFIED" ? 94 : 30,
    canUseAsTrustedContext: status === "VERIFIED",
    matchedItems: hasKnowledge ? 1 : 0,
    sources: hasKnowledge
      ? [
          {
            title: item.source.title,
            publisher: item.source.publisher,
            url: item.source.url,
            type: item.source.type,
          },
        ]
      : [],
    evidence: hasKnowledge
      ? [
          {
            itemId: item.id,
            claim: item.claim,
            status: itemStatus,
            confidence: item.confidence,
            authorityScore: 90,
            corroborated: status === "VERIFIED",
            supportingSources:
              status === "VERIFIED" ? 2 : 0,
            conflictingSources:
              status === "DISPUTED" ? 1 : 0,
            reason: "Test evidence.",
          },
        ]
      : [],
    candidates: hasKnowledge
      ? [
          {
            item,
            score: 10,
            verification: {
              status: itemStatus,
              authorityScore: 90,
              corroborated: status === "VERIFIED",
              supportingSources:
                status === "VERIFIED" ? 2 : 0,
              conflictingSources:
                status === "DISPUTED" ? 1 : 0,
              reason: "Test verification.",
            },
          },
        ]
      : [],
    warnings:
      status === "VERIFIED" || status === "NO_MATCH"
        ? []
        : [status],
    explanation: `Knowledge status ${status}.`,
  };
}

function validLLMResponse(
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    primaryPriority:
      "demanda y adquisición",
    why:
      "La evidencia disponible indica una restricción de demanda y clientes.",
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
    classification: "FACT",
    knowledgeConfidence: 94,
    decisionConfidence: 72,
    facts: [CLAIM],
    evidence: [
      {
        itemId: "knowledge-demand-v3172",
        claim: CLAIM,
        sourceUrl: SOURCE_URL,
        status: "VERIFIED",
        confidence: 94,
      },
    ],
    sources: [SOURCE_URL],
    ...overrides,
  });
}

function latestTrace(): DecisionTrace {
  const trace = traceCapture.traces.at(-1);

  if (trace === undefined) {
    throw new Error("Expected ceoAgent to build a DecisionTrace.");
  }

  return trace;
}

async function runCEO(
  knowledge: AgentKnowledgeContext,
): Promise<Record<string, unknown>> {
  const raw = await ceoAgent(
    MESSAGE,
    {
      memory: {},
      knowledge,
    },
  );

  return JSON.parse(raw) as Record<string, unknown>;
}

describe("Founder OS v3.17.2 — CEO Decision Trace integration", () => {
  beforeEach(() => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE =
      "deterministic";
    askFastMock.mockReset();
    traceCapture.inputs.length = 0;
    traceCapture.traces.length = 0;
    traceCapture.throwOnBuild = false;
  });

  afterEach(() => {
    if (originalDecisionMode === undefined) {
      delete process.env.FOUNDER_OS_CEO_DECISION_MODE;
    } else {
      process.env.FOUNDER_OS_CEO_DECISION_MODE =
        originalDecisionMode;
    }
  });

  it("builds a deterministic fallback trace without changing the public contract", async () => {
    const output = await runCEO(
      makeKnowledge("VERIFIED"),
    );
    const trace = latestTrace();

    expect(trace.decision.resolution).toBe(
      "DETERMINISTIC_FALLBACK",
    );
    expect(trace.decision.acceptedEvidence).toEqual([]);
    expect(Object.keys(output).sort()).toEqual([
      "plan",
      "primaryPriority",
      "successCriteria",
      "whatNotToPrioritize",
      "why",
    ].sort());
    expect(askFastMock).not.toHaveBeenCalled();
  });

  it("builds an LLM trace only after the existing validation accepts the decision", async () => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE = "llm";
    askFastMock.mockResolvedValue(
      validLLMResponse(),
    );

    await runCEO(makeKnowledge("VERIFIED"));

    const trace = latestTrace();

    expect(trace.decision.resolution).toBe("LLM");
    expect(trace.knowledge.status).toBe("VERIFIED");
    expect(trace.knowledge.canUseAsTrustedContext).toBe(true);
    expect(trace.decision.validation?.valid).toBe(true);
    expect(trace.decision.acceptedEvidence).toEqual(
      trace.knowledge.evidence,
    );
  });

  it("records deterministic fallback for invalid LLM JSON", async () => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE = "llm";
    askFastMock.mockResolvedValue("not valid json");

    await runCEO(makeKnowledge("VERIFIED"));

    const trace = latestTrace();

    expect(trace.decision.resolution).toBe(
      "DETERMINISTIC_FALLBACK",
    );
    expect(trace.decision.acceptedEvidence).toEqual([]);
    expect(trace.decision.fallbackReason).toBe(
      "LLM returned invalid JSON.",
    );
  });

  it("does not put fake LLM evidence into acceptedEvidence", async () => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE = "llm";
    askFastMock.mockResolvedValue(
      validLLMResponse({
        evidence: [
          {
            itemId: "fake-item-id",
            claim: "Claim inventado por el LLM.",
            sourceUrl: "https://example.com/fake-source",
            status: "VERIFIED",
            confidence: 100,
          },
        ],
      }),
    );

    await runCEO(makeKnowledge("VERIFIED"));

    const trace = latestTrace();

    expect(trace.decision.resolution).toBe(
      "DETERMINISTIC_FALLBACK",
    );
    expect(trace.decision.acceptedEvidence).toEqual([]);
    expect(trace.knowledge.evidence).not.toContainEqual(
      expect.objectContaining({
        itemId: "fake-item-id",
      }),
    );
  });

  it("preserves VERIFIED knowledge and its validated evidence", async () => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE = "llm";
    askFastMock.mockResolvedValue(
      validLLMResponse(),
    );

    await runCEO(makeKnowledge("VERIFIED"));

    const trace = latestTrace();

    expect(trace.knowledge.status).toBe("VERIFIED");
    expect(trace.knowledge.classification).toBe("FACT");
    expect(trace.knowledge.evidence[0]).toMatchObject({
      itemId: "knowledge-demand-v3172",
      claim: CLAIM,
      sourceUrl: SOURCE_URL,
    });
  });

  it.each([
    ["UNVERIFIED", "WARNING", "UNKNOWN"],
    ["STALE", "WARNING", "UNKNOWN"],
    ["DISPUTED", "BLOCKED", "UNKNOWN"],
    ["REJECTED", "BLOCKED", "UNKNOWN"],
    ["NO_MATCH", "NO_MATCH", "UNKNOWN"],
  ] as const)(
    "preserves %s status without promoting it to FACT",
    async (status, availability, classification) => {
      await runCEO(makeKnowledge(status));

      const trace = latestTrace();

      expect(trace.knowledge.status).toBe(status);
      expect(trace.knowledge.availability).toBe(availability);
      expect(trace.knowledge.classification).toBe(
        classification,
      );
      expect(trace.decision.acceptedEvidence).toEqual([]);

      if (status === "UNVERIFIED" || status === "STALE") {
        expect(trace.knowledge.warnings).toContain(status);
      }

      if (status === "NO_MATCH") {
        expect(trace.knowledge.evidence).toEqual([]);
      }
    },
  );

  it("keeps CEO INFERENCE separate from Knowledge FACT", async () => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE = "llm";
    askFastMock.mockResolvedValue(
      validLLMResponse({
        classification: "INFERENCE",
        facts: [],
        inferences: [
          "La adquisición parece prioritaria.",
        ],
      }),
    );

    await runCEO(makeKnowledge("VERIFIED"));

    const trace = latestTrace();

    expect(trace.knowledge.classification).toBe("FACT");
    expect(trace.decision.classification).toBe(
      "INFERENCE",
    );
    expect(trace.explanation.inferences).toContain(
      "La adquisición parece prioritaria.",
    );
  });

  it("keeps decisionConfidence separate from knowledgeConfidence", async () => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE = "llm";
    askFastMock.mockResolvedValue(
      validLLMResponse({
        decisionConfidence: 61,
      }),
    );

    await runCEO(makeKnowledge("VERIFIED"));

    const trace = latestTrace();

    expect(trace.decision.decisionConfidence).toBe(61);
    expect(trace.knowledge.knowledgeConfidence).toBe(94);
    expect(trace.decision.knowledgeConfidence).toBe(94);
    expect(trace.decision.decisionConfidence).not.toBe(
      trace.decision.knowledgeConfidence,
    );
  });

  it("does not change the public decision if trace construction fails", async () => {
    const expected = await runCEO(
      makeKnowledge("VERIFIED"),
    );

    traceCapture.inputs.length = 0;
    traceCapture.traces.length = 0;
    traceCapture.throwOnBuild = true;

    const actual = await runCEO(
      makeKnowledge("VERIFIED"),
    );

    expect(actual).toEqual(expected);
  });

  it("provides caller-supplied trace identity at the CEO boundary", async () => {
    await runCEO(makeKnowledge("NO_MATCH"));

    const input = traceCapture.inputs[0];
    const trace = latestTrace();

    expect(input.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i,
    );
    expect(Number.isNaN(Date.parse(input.createdAt))).toBe(false);
    expect(trace.input.message).toBe(MESSAGE);
  });
});

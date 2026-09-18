import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("../../lib/ai/ollama", () => ({
  askFast: vi.fn(),
}));

import { askFast } from "../../lib/ai/ollama";
import { ceoAgent } from "../../lib/agents/ceo";
import { AgentKnowledgeService } from "../../lib/agents/knowledge/agentKnowledgeService";
import { KnowledgeDecisionService } from "../../lib/agents/knowledge/decision/knowledgeDecisionService";
import { KnowledgeQueryService } from "../../lib/knowledge/query/knowledgeQueryService";
import { LocalKnowledgeRepository } from "../../lib/knowledge/repository/LocalKnowledgeRepository";
import type { KnowledgeItem, KnowledgeVerificationStatus } from "../../lib/knowledge/types";

const askFastMock = vi.mocked(askFast);

const CLAIM =
  "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.";
const SOURCE_URL = "https://example.com/verified-demand";
const REVENUE_CLAIM = "Revenue increased 10%.";
const REVENUE_SOURCE_URL =
  "https://example.com/revenue-report";
const ITEM_A_SOURCE_URL =
  "https://example.com/item-a-source";
const ITEM_B_SOURCE_URL =
  "https://example.com/item-b-source";
const DEMAND_MESSAGE =
  "Nuestro pipeline está casi vacío y necesitamos adquirir nuevos clientes.";

const originalDecisionMode =
  process.env.FOUNDER_OS_CEO_DECISION_MODE;

type DecisionRun = {
  output: Record<string, unknown>;
  context: Awaited<
    ReturnType<AgentKnowledgeService["getContext"]>
  >;
  decision: ReturnType<KnowledgeDecisionService["createContext"]>;
};

function makeItem(
  overrides: Partial<KnowledgeItem> = {},
): KnowledgeItem {
  return {
    id: "knowledge-demand-v316",
    claim: CLAIM,
    source: {
      title: "Verified demand report",
      publisher: "Founder OS Test Research",
      url: SOURCE_URL,
      type: "research",
    },
    topic: "commercial demand",
    confidence: 95,
    verificationStatus: "VERIFIED",
    tags: ["pipeline", "demand", "customers"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function groundedResponse(
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    primaryPriority:
      "demand and acquisition — Generar demanda y adquirir clientes",
    why:
      "La decisión usa la evidencia disponible para priorizar adquisición de clientes.",
    plan: [
      "Definir el cliente ideal y priorizar los segmentos con mayor potencial.",
      "Construir una lista de prospectos cualificados y ejecutar contacto comercial diario.",
      "Medir semanalmente respuestas, reuniones y oportunidades generadas.",
    ],
    successCriteria: [
      "Generar al menos 30 conversaciones comerciales cualificadas en 30 días.",
      "Crear al menos 10 oportunidades comerciales nuevas antes del día 30.",
    ],
    whatNotToPrioritize:
      "No priorizar fundraising durante estos 30 días.",
    ...overrides,
  });
}

function groundedFactResponse(
  evidence: {
    itemId: string;
    claim: string;
    sourceUrl: string;
    status: KnowledgeVerificationStatus;
    confidence?: number;
  },
  overrides: Record<string, unknown> = {},
): string {
  return groundedResponse({
    classification: "FACT",
    knowledgeConfidence: 95,
    facts: [evidence.claim],
    evidence: [evidence],
    sources: [evidence.sourceUrl],
    ...overrides,
  });
}

function expectGroundingFallback(
  run: DecisionRun,
  response: string,
): void {
  expect(() => JSON.parse(response)).not.toThrow();
  expect(run.output.why).toContain("pipeline comercial");
  expect(run.output.why).not.toContain("evidencia disponible");
  expect(askFastMock).toHaveBeenCalledTimes(1);
}

function unknownResponse(
  overrides: Record<string, unknown> = {},
): string {
  return groundedResponse({
    primaryPriority:
      "unknown — inferencia sobre evidencia pendiente",
    why:
      "La hipótesis requiere más evidencia antes de definir el cuello de botella.",
    classification: "UNKNOWN",
    decisionConfidence: 20,
    unknowns: [
      "No existe evidencia suficiente para afirmar un cuello de botella actual.",
    ],
    ...overrides,
  });
}

async function createKnowledgeContext(
  items: KnowledgeItem[],
  query = "pipeline comercial",
) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "founder-os-v316-"),
  );
  const filePath = path.join(
    directory,
    "knowledge.json",
  );

  await writeFile(
    filePath,
    `${JSON.stringify(items, null, 2)}\n`,
    "utf8",
  );

  const repository = new LocalKnowledgeRepository(
    filePath,
  );
  const queryService = new KnowledgeQueryService(
    repository,
  );
  const agentKnowledge = new AgentKnowledgeService(
    queryService,
  );
  const context = await agentKnowledge.getContext(
    query,
  );
  const decision = new KnowledgeDecisionService().createContext(
    context,
  );

  return {
    context,
    decision,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

async function runDecision(
  items: KnowledgeItem[],
  response: string,
  query = "pipeline comercial",
  message = "¿Cuál debería ser nuestra prioridad estratégica?",
): Promise<DecisionRun> {
  const knowledge = await createKnowledgeContext(
    items,
    query,
  );

  askFastMock.mockResolvedValue(response);

  try {
    const raw = await ceoAgent(
      message,
      {
        memory: {},
        knowledge: knowledge.context,
      },
    );

    return {
      output: JSON.parse(raw) as Record<string, unknown>,
      context: knowledge.context,
      decision: knowledge.decision,
    };
  } finally {
    await knowledge.cleanup();
  }
}

describe("Founder OS v3.16 — knowledge-grounded CEO decision", () => {
  beforeEach(() => {
    process.env.FOUNDER_OS_CEO_DECISION_MODE = "llm";
    askFastMock.mockReset();
  });

  afterEach(() => {
    if (originalDecisionMode === undefined) {
      delete process.env.FOUNDER_OS_CEO_DECISION_MODE;
    } else {
      process.env.FOUNDER_OS_CEO_DECISION_MODE =
        originalDecisionMode;
    }
  });

  it("uses VERIFIED knowledge as a traceable FACT", async () => {
    const run = await runDecision(
      [makeItem()],
      groundedFactResponse(
        {
          itemId: "knowledge-demand-v316",
          claim: CLAIM,
          sourceUrl: SOURCE_URL,
          status: "VERIFIED",
        },
        { decisionConfidence: 84 },
      ),
    );

    expect(run.context.availability).toBe("AVAILABLE");
    expect(run.decision.classification).toBe("FACT");
    expect(run.output.why).toContain("evidencia disponible");
    expect(askFastMock).toHaveBeenCalledTimes(1);
  });

  it("accepts an exact canonical claim", async () => {
    const run = await runDecision(
      [
        makeItem({
          id: "knowledge-revenue-a",
          claim: REVENUE_CLAIM,
          source: {
            title: "Revenue report",
            publisher: "Founder OS Test Research",
            url: REVENUE_SOURCE_URL,
            type: "research",
          },
        }),
      ],
      groundedFactResponse(
        {
          itemId: "knowledge-revenue-a",
          claim: " revenue increased 10% ",
          sourceUrl: REVENUE_SOURCE_URL,
          status: "VERIFIED",
        },
        { decisionConfidence: 82 },
      ),
      "revenue",
      DEMAND_MESSAGE,
    );

    expect(run.decision.classification).toBe("FACT");
    expect(run.output.why).toContain("evidencia disponible");
    expect(askFastMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an expanded claim that is not an exact match", async () => {
    const response = groundedFactResponse({
      itemId: "knowledge-revenue-a",
      claim:
        "Revenue increased 10% and will continue increasing during the next five years.",
      sourceUrl: REVENUE_SOURCE_URL,
      status: "VERIFIED",
    }, { facts: [REVENUE_CLAIM] });

    const run = await runDecision(
      [
        makeItem({
          id: "knowledge-revenue-a",
          claim: REVENUE_CLAIM,
          source: {
            title: "Revenue report",
            publisher: "Founder OS Test Research",
            url: REVENUE_SOURCE_URL,
            type: "research",
          },
        }),
      ],
      response,
      "revenue",
      DEMAND_MESSAGE,
    );

    expectGroundingFallback(run, response);
  });

  it("rejects an evidence citation with a wrong itemId", async () => {
    const response = groundedFactResponse({
      itemId: "hallucinated-item",
      claim: CLAIM,
      sourceUrl: SOURCE_URL,
      status: "VERIFIED",
    });

    const run = await runDecision(
      [makeItem()],
      response,
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expectGroundingFallback(run, response);
  });

  it("rejects a correct itemId with a wrong source URL", async () => {
    const response = groundedFactResponse({
      itemId: "knowledge-demand-v316",
      claim: CLAIM,
      sourceUrl: "https://example.com/wrong-source",
      status: "VERIFIED",
    }, {
      sources: [SOURCE_URL],
    });

    const run = await runDecision(
      [makeItem()],
      response,
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expectGroundingFallback(run, response);
  });

  it("rejects an item-A citation paired with item-B source", async () => {
    const response = groundedFactResponse({
      itemId: "knowledge-item-a",
      claim: CLAIM,
      sourceUrl: ITEM_B_SOURCE_URL,
      status: "VERIFIED",
    });

    const run = await runDecision(
      [
        makeItem({
          id: "knowledge-item-a",
          source: {
            title: "Item A source",
            publisher: "Founder OS Test Research",
            url: ITEM_A_SOURCE_URL,
            type: "research",
          },
        }),
        makeItem({
          id: "knowledge-item-b",
          claim:
            "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.",
          source: {
            title: "Item B source",
            publisher: "Founder OS Test Research",
            url: ITEM_B_SOURCE_URL,
            type: "research",
          },
        }),
      ],
      response,
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expectGroundingFallback(run, response);
  });

  it("rejects knowledge confidence inflation", async () => {
    const response = groundedFactResponse({
      itemId: "knowledge-demand-v316",
      claim: CLAIM,
      sourceUrl: SOURCE_URL,
      status: "VERIFIED",
    }, {
      knowledgeConfidence: 99,
    });

    const run = await runDecision(
      [makeItem()],
      response,
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expectGroundingFallback(run, response);
  });

  it("rejects evidence confidence inflation", async () => {
    const response = groundedFactResponse({
      itemId: "knowledge-demand-v316",
      claim: CLAIM,
      sourceUrl: SOURCE_URL,
      status: "VERIFIED",
      confidence: 99,
    });

    const run = await runDecision(
      [makeItem()],
      response,
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expectGroundingFallback(run, response);
  });

  it("rejects FACT without explicit VERIFIED evidence", async () => {
    const response = groundedResponse({
      classification: "FACT",
      knowledgeConfidence: 95,
      facts: [CLAIM],
      sources: [SOURCE_URL],
    });

    const run = await runDecision(
      [makeItem()],
      response,
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expectGroundingFallback(run, response);
  });

  it("accepts an INFERENCE explicitly based on a verified fact", async () => {
    const run = await runDecision(
      [makeItem()],
      groundedFactResponse(
        {
          itemId: "knowledge-demand-v316",
          claim: CLAIM,
          sourceUrl: SOURCE_URL,
          status: "VERIFIED",
        },
        {
          classification: "INFERENCE",
          decisionConfidence: 74,
          inferences: [
            "La evidencia sugiere que la adquisición debería ser una prioridad.",
          ],
        },
      ),
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expect(run.decision.classification).toBe("FACT");
    expect(run.output.why).toContain("evidencia disponible");
    expect(askFastMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["STALE", "STALE", 95],
    ["UNVERIFIED", "UNVERIFIED", 95],
    ["DISPUTED", "DISPUTED", 95],
    ["REJECTED", "REJECTED", 0],
  ] as const)(
    "rejects FACT for %s knowledge",
    async (label, status, confidence) => {
      const response = groundedFactResponse({
        itemId: "knowledge-demand-v316",
        claim: CLAIM,
        sourceUrl: SOURCE_URL,
        status,
      }, { knowledgeConfidence: confidence });

      const run = await runDecision(
        [
          makeItem({
            ...(status === "STALE"
              ? {
                  expiresAt: "2020-01-01T00:00:00.000Z",
                }
              : {}),
            verificationStatus:
              status === "STALE"
                ? "VERIFIED"
                : status,
          }),
        ],
        response,
        "pipeline comercial",
        DEMAND_MESSAGE,
      );

      expect(label).toBe(status);
      expectGroundingFallback(run, response);
    },
  );

  it("rejects FACT when the query has NO_MATCH", async () => {
    const response = groundedResponse({
      classification: "FACT",
      knowledgeConfidence: 0,
      facts: [CLAIM],
    });

    const run = await runDecision(
      [
        makeItem({
          claim: "La empresa opera una plataforma de logística industrial.",
          topic: "operations",
          tags: ["operations"],
        }),
      ],
      response,
      "pipeline comercial",
      DEMAND_MESSAGE,
    );

    expect(run.context.availability).toBe("NO_MATCH");
    expectGroundingFallback(run, response);
  });

  it.each(["ASSUMPTION", "UNKNOWN"] as const)(
    "does not turn %s metadata with asserted facts into FACT",
    async (classification) => {
      const response = groundedResponse({
        classification,
        knowledgeConfidence: 0,
        facts: [CLAIM],
      });

      const run = await runDecision(
        [
          makeItem({
            claim: "La empresa opera una plataforma de logística industrial.",
            topic: "operations",
            tags: ["operations"],
          }),
        ],
        response,
        "pipeline comercial",
        DEMAND_MESSAGE,
      );

      expectGroundingFallback(run, response);
    },
  );

  it("keeps NO_MATCH as UNKNOWN without fabricated facts", async () => {
    const run = await runDecision(
      [
        makeItem({
          claim: "La empresa opera una plataforma de logística industrial.",
          topic: "operations",
          tags: ["operations"],
        }),
      ],
      unknownResponse(),
    );

    expect(run.context.availability).toBe("NO_MATCH");
    expect(run.decision.classification).toBe("UNKNOWN");
    expect(run.output.primaryPriority).toContain("unknown");
    expect(run.output.why).toContain("evidencia");
  });

  it("allows STALE knowledge only as labelled inference", async () => {
    const run = await runDecision(
      [
        makeItem({
          expiresAt: "2020-01-01T00:00:00.000Z",
        }),
      ],
      unknownResponse({
        classification: "INFERENCE",
        evidence: [
          {
            itemId: "knowledge-demand-v316",
            claim: CLAIM,
            sourceUrl: SOURCE_URL,
            status: "STALE",
          },
        ],
      }),
    );

    expect(run.context.status).toBe("STALE");
    expect(run.context.canUseAsTrustedContext).toBe(false);
    expect(run.decision.classification).toBe("UNKNOWN");
    expect(run.output.why).toContain("evidencia");
  });

  it("allows UNVERIFIED knowledge only as labelled inference", async () => {
    const run = await runDecision(
      [
        makeItem({
          verificationStatus: "UNVERIFIED",
        }),
      ],
      unknownResponse({
        classification: "INFERENCE",
        evidence: [
          {
            itemId: "knowledge-demand-v316",
            claim: CLAIM,
            sourceUrl: SOURCE_URL,
            status: "UNVERIFIED",
          },
        ],
      }),
    );

    expect(run.context.status).toBe("UNVERIFIED");
    expect(run.context.canUseAsTrustedContext).toBe(false);
    expect(run.decision.classification).toBe("UNKNOWN");
  });

  it.each([
    ["DISPUTED", "BLOCKED"],
    ["REJECTED", "BLOCKED"],
  ] as const)(
    "blocks %s knowledge from trusted CEO context",
    async (status, availability) => {
      const run = await runDecision(
        [
          makeItem({
            verificationStatus:
              status as KnowledgeVerificationStatus,
          }),
        ],
        unknownResponse(),
      );

      expect(run.context.status).toBe(status);
      expect(run.context.availability).toBe(availability);
      expect(run.context.canUseAsTrustedContext).toBe(false);
      expect(run.decision.classification).toBe("UNKNOWN");
    },
  );

  it("falls back when the LLM returns invalid JSON", async () => {
    const run = await runDecision(
      [makeItem()],
      "not valid json",
    );

    expect(run.output.primaryPriority).toContain("demand");
    expect(run.output.why).toContain("pipeline comercial");
  });

  it("falls back on hallucinated evidence or sources", async () => {
    const run = await runDecision(
      [makeItem()],
      groundedResponse({
        classification: "FACT",
        evidence: [
          {
            itemId: "hallucinated-item",
            claim: "Un claim inventado por el modelo.",
            sourceUrl: "https://hallucinated.example/source",
            status: "VERIFIED",
          },
        ],
        sources: ["https://hallucinated.example/source"],
      }),
    );

    expect(run.output.primaryPriority).toContain("demand");
    expect(run.output.why).toContain("pipeline comercial");
  });

  it("falls back when FACT is unsupported by the boundary", async () => {
    const run = await runDecision(
      [
        makeItem({
          verificationStatus: "UNVERIFIED",
        }),
      ],
      groundedResponse({
        classification: "FACT",
        facts: [CLAIM],
        evidence: [
          {
            itemId: "knowledge-demand-v316",
            claim: CLAIM,
            sourceUrl: SOURCE_URL,
            status: "UNVERIFIED",
          },
        ],
        sources: [SOURCE_URL],
      }),
    );

    expect(run.output.primaryPriority).toContain("unknown");
    expect(run.output.why).toContain("contexto actual");
  });

  it("falls back when the LLM provider is unavailable", async () => {
    const knowledge = await createKnowledgeContext(
      [makeItem()],
    );
    askFastMock.mockRejectedValue(
      new Error("mock provider unavailable"),
    );

    try {
      const raw = await ceoAgent(
        "¿Cuál debería ser nuestra prioridad estratégica?",
        {
          memory: {},
          knowledge: knowledge.context,
        },
      );
      const output = JSON.parse(raw) as Record<string, unknown>;

      expect(output.primaryPriority).toContain("demand");
      expect(output.why).toContain("pipeline comercial");
    } finally {
      await knowledge.cleanup();
    }
  });
});

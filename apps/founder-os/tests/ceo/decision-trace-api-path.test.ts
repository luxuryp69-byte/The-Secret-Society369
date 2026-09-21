import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  ceoAgentMock,
  saveDecisionTraceMock,
} = vi.hoisted(() => ({
  ceoAgentMock: vi.fn(),
  saveDecisionTraceMock: vi.fn(),
}));

vi.mock(
  "../../lib/agents/ceo",
  () => ({
    ceoAgent: ceoAgentMock,
  }),
);

vi.mock(
  "../../lib/agents/decisionTrace/store",
  () => ({
    saveDecisionTrace:
      saveDecisionTraceMock,
  }),
);

vi.mock(
  "../../lib/kernel/runtime",
  () => ({
    getKernel: vi.fn(async () => ({
      knowledgeRepository: {},
    })),
  }),
);

vi.mock(
  "../../lib/memory/context",
  () => ({
    buildMemoryContext: vi.fn(
      async () => ({
        founder: {},
        company: {},
        product: {},
        goals: [],
        decisions: [],
        knowledge: [],
        conversations: [],
        insights: [],
      }),
    ),
  }),
);

vi.mock(
  "../../lib/knowledge/query/knowledgeQueryService",
  () => ({
    KnowledgeQueryService: class {
      async query() {
        return {};
      }
    },
  }),
);

vi.mock(
  "../../lib/agents/knowledge/agentKnowledgeService",
  () => ({
    AgentKnowledgeService: class {
      constructor(
        _queryService: unknown,
      ) {}

      async getContext() {
        return {};
      }
    },
  }),
);

import { answer } from "../../lib/chat/answer";

function createTrace(message: string) {
  return {
    traceId: `api-path-${message.replace(/\W+/g, "-")}`,
    createdAt:
      "2026-01-01T00:00:00.000Z",
    input: {
      message,
    },
    strategicSignal: {
      constraint: "demand",
      evidence: ["test evidence"],
      confidence: 0.9,
    },
    knowledge: {
      query: message,
      availability: "AVAILABLE",
      status: "VERIFIED",
      classification: "FACT",
      canUseAsTrustedContext: true,
      answer: "verified test answer",
      facts: ["verified test fact"],
      inferences: [],
      assumptions: [],
      unknowns: [],
      confidence: 0.9,
      knowledgeConfidence: 0.9,
      sources: [],
      evidence: [],
      warnings: [],
      explanation: "test",
    },
    decision: {
      output: {
        primaryPriority:
          "Validate demand",
        why: "Test",
        plan: [
          "Step one",
          "Step two",
          "Step three",
        ],
        successCriteria: [
          "Criterion one",
          "Criterion two",
        ],
        whatNotToPrioritize:
          "Unrelated work",
      },
      metadata: {
        resolution:
          "DETERMINISTIC_FALLBACK",
        fallbackReason: "test",
      },
    },
    explanation: {
      facts: ["verified test fact"],
      inferences: [],
      assumptions: [],
      unknowns: [],
      warnings: [],
      strategicConstraints: [
        "demand",
      ],
      excludedInformation: [],
    },
  };
}

describe(
  "Founder OS v3.18.1 — production answer trace path",
  () => {
    beforeEach(() => {
      ceoAgentMock.mockReset();
      saveDecisionTraceMock.mockReset();

      saveDecisionTraceMock.mockResolvedValue(
        undefined,
      );
    });

    it("persists the trace before answer() resolves", async () => {
      const message =
        "How should I validate demand?";
      const trace = createTrace(message);

      ceoAgentMock.mockImplementation(
        async (
          _message: string,
          context?: {
            memory?: unknown;
            knowledge?: unknown;
            onDecisionTrace?: (
              trace: unknown,
            ) => void;
          },
        ) => {
          context?.onDecisionTrace?.(trace);

          return JSON.stringify({
            primaryPriority:
              "Validate demand",
            why: "Test",
            plan: [
              "Step one",
              "Step two",
              "Step three",
            ],
            successCriteria: [
              "Criterion one",
              "Criterion two",
            ],
            whatNotToPrioritize:
              "Unrelated work",
          });
        },
      );

      const response = await answer(
        message,
      );

      expect(typeof response).toBe("string");

      expect(
        saveDecisionTraceMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        saveDecisionTraceMock,
      ).toHaveBeenCalledWith(trace);

      expect(
        ceoAgentMock.mock.invocationCallOrder.at(-1)!,
      ).toBeLessThan(
        saveDecisionTraceMock.mock.invocationCallOrder[0],
      );
    });

    it("propagates the trace observer after persistence", async () => {
      const message =
        "How should I validate demand?";
      const trace = createTrace(message);
      const traces: unknown[] = [];

      ceoAgentMock.mockImplementation(
        async (
          _message: string,
          context?: {
            onDecisionTrace?: (
              trace: unknown,
            ) => void;
          },
        ) => {
          context?.onDecisionTrace?.(trace);

          return JSON.stringify({
            primaryPriority:
              "Validate demand",
            why: "Test",
            plan: [
              "Step one",
              "Step two",
              "Step three",
            ],
            successCriteria: [
              "Criterion one",
              "Criterion two",
            ],
            whatNotToPrioritize:
              "Unrelated work",
          });
        },
      );

      await answer(message, {
        onDecisionTrace: (captured) => {
          traces.push(captured);
        },
      });

      expect(traces).toHaveLength(1);
      expect(traces[0]).toEqual(trace);

      expect(
        ceoAgentMock.mock.invocationCallOrder.at(-1)!,
      ).toBeLessThan(
        saveDecisionTraceMock.mock.invocationCallOrder[0],
      );
    });

    it("does not let a failing trace observer alter the CEO response", async () => {
      const trace =
        createTrace(
          "How should I validate demand?",
        );

      ceoAgentMock.mockImplementation(
        async (
          _message: string,
          context?: {
            onDecisionTrace?: (
              trace: unknown,
            ) => void;
          },
        ) => {
          context?.onDecisionTrace?.(trace);

          return JSON.stringify({
            primaryPriority:
              "Validate demand",
            why: "Test",
            plan: [
              "Step one",
              "Step two",
              "Step three",
            ],
            successCriteria: [
              "Criterion one",
              "Criterion two",
            ],
            whatNotToPrioritize:
              "Unrelated work",
          });
        },
      );

      const response = await answer(
        "How should I validate demand?",
        {
          onDecisionTrace: () => {
            throw new Error(
              "observer failure",
            );
          },
        },
      );

      expect(
        JSON.parse(response),
      ).toMatchObject({
        primaryPriority:
          "Validate demand",
      });
    });

    it("continues when trace persistence fails", async () => {
      const trace =
        createTrace(
          "How should I validate demand?",
        );

      saveDecisionTraceMock.mockRejectedValue(
        new Error("storage unavailable"),
      );

      ceoAgentMock.mockImplementation(
        async (
          _message: string,
          context?: {
            onDecisionTrace?: (
              trace: unknown,
            ) => void;
          },
        ) => {
          context?.onDecisionTrace?.(trace);

          return JSON.stringify({
            primaryPriority:
              "Validate demand",
            why: "Test",
            plan: [
              "Step one",
              "Step two",
              "Step three",
            ],
            successCriteria: [
              "Criterion one",
              "Criterion two",
            ],
            whatNotToPrioritize:
              "Unrelated work",
          });
        },
      );

      const response = await answer(
        "How should I validate demand?",
      );

      expect(
        JSON.parse(response),
      ).toMatchObject({
        primaryPriority:
          "Validate demand",
      });
    });

    it("keeps the public answer contract unchanged", async () => {
      const trace =
        createTrace(
          "How should I validate demand?",
        );

      ceoAgentMock.mockImplementation(
        async (
          _message: string,
          context?: {
            onDecisionTrace?: (
              trace: unknown,
            ) => void;
          },
        ) => {
          context?.onDecisionTrace?.(trace);

          return JSON.stringify({
            primaryPriority:
              "Validate demand",
            why: "Test",
            plan: [
              "Step one",
              "Step two",
              "Step three",
            ],
            successCriteria: [
              "Criterion one",
              "Criterion two",
            ],
            whatNotToPrioritize:
              "Unrelated work",
          });
        },
      );

      const response = await answer(
        "How should I validate demand?",
        {
          onDecisionTrace: () => {},
        },
      );

      const parsed = JSON.parse(
        response,
      );

      expect(
        Object.keys(parsed).sort(),
      ).toEqual([
        "plan",
        "primaryPriority",
        "successCriteria",
        "whatNotToPrioritize",
        "why",
      ]);
    });
  },
);

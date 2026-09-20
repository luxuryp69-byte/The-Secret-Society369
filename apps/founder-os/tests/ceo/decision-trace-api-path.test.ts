import { describe, expect, it, vi } from "vitest";
import { answer } from "../../lib/chat/answer";

const ceoAgentMock = vi.hoisted(() =>
  vi.fn(async (_message: string, context?: {
    memory?: unknown;
    knowledge?: unknown;
    onDecisionTrace?: (trace: unknown) => void;
  }) => {
    context?.onDecisionTrace?.({
      traceId: "api-path-trace-test",
      createdAt: "2026-01-01T00:00:00.000Z",
      input: {
        message: _message,
      },
      strategicSignal: {
        constraint: "demand",
        evidence: "test evidence",
        confidence: 0.9,
      },
      knowledge: {
        query: _message,
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
          primaryPriority: "Validate demand",
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
          whatNotToPrioritize: "Unrelated work",
        },
        metadata: {
          resolution: "DETERMINISTIC_FALLBACK",
          fallbackReason: "test",
        },
      },
      explanation: {
        facts: ["verified test fact"],
        inferences: [],
        assumptions: [],
        unknowns: [],
        warnings: [],
        strategicConstraints: ["demand"],
        excludedInformation: [],
      },
    });

    return JSON.stringify({
      primaryPriority: "Validate demand",
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
      whatNotToPrioritize: "Unrelated work",
    });
  }),
);

vi.mock("../../lib/agents/ceo", () => ({
  ceoAgent: ceoAgentMock,
}));

vi.mock("../../lib/kernel/runtime", () => ({
  getKernel: vi.fn(async () => ({
    knowledgeRepository: {},
  })),
}));

vi.mock("../../lib/memory/context", () => ({
  buildMemoryContext: vi.fn(async () => ({
    founder: {},
    company: {},
    goals: [],
    knowledge: [],
    conversations: [],
  })),
}));

vi.mock("../../lib/knowledge/query", () => ({
  KnowledgeQueryService: class {
    async query() {
      return {};
    }
  },
}));

vi.mock("../../lib/agents/knowledge/service", () => ({
  AgentKnowledgeService: class {
    buildContext() {
      return {};
    }
  },
}));

describe("Founder OS v3.17.3 — production answer trace path", () => {
  it("propagates the trace observer through answer() into ceoAgent()", async () => {
    const traces: unknown[] = [];

    const response = await answer("How should I validate demand?", {
      onDecisionTrace: (trace) => {
        traces.push(trace);
      },
    });

    expect(typeof response).toBe("string");
    expect(ceoAgentMock).toHaveBeenCalledTimes(1);
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({
      traceId: "api-path-trace-test",
      input: {
        message: "How should I validate demand?",
      },
    });
  });

  it("does not let a failing trace observer alter the CEO response", async () => {
    const response = await answer("How should I validate demand?", {
      onDecisionTrace: () => {
        throw new Error("observer failure");
      },
    });

    expect(typeof response).toBe("string");

    expect(JSON.parse(response)).toMatchObject({
      primaryPriority: "Validate demand",
    });
  });

  it("keeps the public answer contract unchanged when a trace observer is supplied", async () => {
    const response = await answer("How should I validate demand?", {
      onDecisionTrace: () => {},
    });

    expect(typeof response).toBe("string");

    const parsed = JSON.parse(response);

    expect(Object.keys(parsed).sort()).toEqual([
      "plan",
      "primaryPriority",
      "successCriteria",
      "whatNotToPrioritize",
      "why",
    ]);
  });
});

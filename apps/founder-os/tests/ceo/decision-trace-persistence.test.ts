import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  unlink,
} from "node:fs/promises";
import path from "node:path";

import type { DecisionTrace } from "@/lib/agents/decisionTrace/types";
import {
  LocalDecisionTraceRepository,
} from "@/lib/agents/decisionTrace/store";

const TEST_FILE_NAME =
  `decision-traces-test-${process.pid}.json`;

const TEST_FILE_PATH = path.join(
  process.cwd(),
  "data",
  TEST_FILE_NAME,
);

function createTrace(
  traceId = "trace-001",
): DecisionTrace {
  return {
    traceId,
    createdAt:
      "2026-09-20T00:00:00.000Z",

    input: {
      message:
        "Should I focus on demand?",
    },

    strategicSignal: {
      constraint: "demand",
      evidence: [
        "pipeline is empty",
      ],
      confidence: 0.9,
    },

    memory: {
      available: true,
      categories: ["company"],
      references: [],
      provenance: {
        source: "FOUNDER_MEMORY",
        kind: "CONTEXT",
      },
    },

    knowledge: {
      query:
        "Should I focus on demand?",
      availability: "NO_MATCH",
      status: "NO_MATCH",
      classification: "UNKNOWN",
      canUseAsTrustedContext: false,
      knowledgeConfidence: 0,
      evidence: [],
      sources: [],
      warnings: [],
      excludedInformation: [],
    },

    decision: {
      output: {
        primaryPriority:
          "Validate demand",
        why:
          "The current signal points to demand.",
        plan: [
          "Interview customers",
          "Test the offer",
          "Measure conversion",
        ],
        successCriteria: [
          "Qualified demand increases",
          "Conversion becomes measurable",
        ],
        whatNotToPrioritize:
          "Unvalidated expansion",
      },
      resolution:
        "DETERMINISTIC_FALLBACK",
      knowledgeConfidence: 0,
      acceptedEvidence: [],
    },

    explanation: {
      facts: [],
      inferences: [],
      assumptions: [],
      unknowns: [
        "No verified knowledge matched.",
      ],
      warnings: [],
      strategicConstraints: [
        "demand",
      ],
      excludedInformation: [],
    },
  };
}

describe(
  "Founder OS v3.18.1 — Decision Trace persistence",
  () => {
    const originalFile =
      process.env.DECISION_TRACE_FILE;

    beforeAll(async () => {
      process.env.DECISION_TRACE_FILE =
        TEST_FILE_NAME;

      await unlink(TEST_FILE_PATH).catch(
        () => undefined,
      );
    });

    afterAll(async () => {
      if (originalFile === undefined) {
        delete process.env.DECISION_TRACE_FILE;
      } else {
        process.env.DECISION_TRACE_FILE =
          originalFile;
      }

      await unlink(TEST_FILE_PATH).catch(
        () => undefined,
      );
    });

    it("persists and retrieves the exact trace", async () => {
      const repository =
        new LocalDecisionTraceRepository();

      const trace = createTrace();

      await repository.save(trace);

      await expect(
        repository.get(trace.traceId),
      ).resolves.toEqual(trace);
    });

    it("returns null for an unknown trace", async () => {
      const repository =
        new LocalDecisionTraceRepository();

      await expect(
        repository.get("missing"),
      ).resolves.toBeNull();
    });

    it("uses traceId as immutable identity", async () => {
      const repository =
        new LocalDecisionTraceRepository();

      const first =
        createTrace("identity-trace-001");
      const second =
        createTrace("identity-trace-002");

      await repository.save(first);
      await repository.save(second);

      await expect(
        repository.get("identity-trace-001"),
      ).resolves.toEqual(first);

      await expect(
        repository.get("identity-trace-002"),
      ).resolves.toEqual(second);
    });

    it("rejects duplicate trace IDs", async () => {
      const repository =
        new LocalDecisionTraceRepository();

      const first =
        createTrace("immutable-id");

      const second = {
        ...createTrace("immutable-id"),
        input: {
          message: "attempted mutation",
        },
      };

      await repository.save(first);

      await expect(
        repository.save(second),
      ).rejects.toThrow(
        "Decision trace already exists: immutable-id",
      );

      await expect(
        repository.get("immutable-id"),
      ).resolves.toEqual(first);
    });

    it("does not expose mutation or listing operations", () => {
      const repository =
        new LocalDecisionTraceRepository();

      expect(
        "delete" in repository,
      ).toBe(false);

      expect(
        "update" in repository,
      ).toBe(false);

      expect(
        "list" in repository,
      ).toBe(false);
    });
  },
);

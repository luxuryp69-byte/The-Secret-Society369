import { describe, expect, it } from "vitest";

import {
  projectTraceMemory,
} from "@/lib/agents/decisionTrace/memoryProjection";

import {
  buildDecisionTrace,
} from "@/lib/agents/decisionTrace/buildDecisionTrace";

import type {
  AgentKnowledgeDecisionContext,
} from "@/lib/agents/knowledge/decision/types";

const SOURCE_URL =
  "https://example.com/verified-demand";

const CLAIM =
  "La empresa tiene dificultades para conseguir nuevos clientes.";

function makeKnowledge():
  AgentKnowledgeDecisionContext {
  return {
    query: "demanda",
    availability: "AVAILABLE",
    status: "VERIFIED",
    classification: "FACT",
    canUseAsTrustedContext: true,
    answer: CLAIM,
    facts: [CLAIM],
    inferences: [],
    assumptions: [],
    unknowns: [],
    confidence: 94,
    knowledgeConfidence: 94,
    sources: [
      {
        title: "Verified source",
        publisher: "Example",
        url: SOURCE_URL,
        type: "official",
      },
    ],
    evidence: [
      {
        itemId: "knowledge-v3175",
        claim: CLAIM,
        status: "VERIFIED",
        confidence: 94,
        authorityScore: 90,
        corroborated: true,
        supportingSources: 1,
        conflictingSources: 0,
        reason: "Validated by Knowledge Layer.",
        sourceUrls: [SOURCE_URL],
      },
    ],
    warnings: [],
    explanation: "Verified knowledge.",
  };
}

function makeSignal() {
  return {
    constraint: "demand" as const,
    evidence: [
      "El contexto menciona dificultades de demanda.",
    ],
    confidence: 90,
  };
}

function makeDecision() {
  return {
    output: {
      primaryPriority: "Demand",
      why: "The verified evidence indicates a demand constraint.",
      plan: [
        "Measure pipeline.",
        "Contact prospects.",
        "Review conversion.",
      ],
      successCriteria: [
        "Pipeline increases.",
        "Conversion improves.",
      ],
      whatNotToPrioritize:
        "Avoid unrelated expansion.",
    },
    metadata: {
      resolution: "LLM" as const,
      classification: "FACT" as const,
      decisionConfidence: 90,
      acceptedEvidence: [
        {
          itemId: "knowledge-v3175",
          claim: CLAIM,
          sourceUrl: SOURCE_URL,
          sourceUrls: [SOURCE_URL],
          status: "VERIFIED" as const,
          confidence: 94,
          authorityScore: 90,
          corroborated: true,
          supportingSources: 1,
          conflictingSources: 0,
          reason: "Validated by Knowledge Layer.",
        },
      ],
      validation: {
        valid: true,
        classification: "FACT" as const,
        reason: "Validated by Knowledge Layer.",
      },
    },
  };
}

describe(
  "DecisionTrace memory provenance v3.17.5",
  () => {
    it(
      "projects Founder Memory as contextual provenance",
      () => {
        const memory = {
          founder: {
            name: "Founder",
          },
          company: {
            name: "Example Co",
          },
          product: {
            name: "Product",
          },
          goals: [
            {
              id: "goal-1",
              text: "Increase revenue",
              completed: false,
            },
          ],
          decisions: [
            {
              id: "decision-1",
              decision: "Focus on demand",
              date: "2026-09-20",
            },
          ],
          knowledge: [
            "Internal memory note",
          ],
          conversations: [
            "Conversation one",
          ],
          insights: [
            "Internal insight",
          ],
        };

        const traceMemory =
          projectTraceMemory(memory);

        expect(traceMemory.available)
          .toBe(true);

        expect(
          traceMemory.categories,
        ).toEqual([
          "founder",
          "company",
          "product",
          "goals",
          "decisions",
          "knowledge",
          "conversations",
          "insights",
        ]);

        expect(
          traceMemory.references,
        ).toEqual([
          {
            category: "goals",
            reference: "goal-1",
            relation: "AVAILABLE_CONTEXT",
            provenance: {
              source: "FOUNDER_MEMORY",
              kind: "CONTEXT",
            },
          },
          {
            category: "decisions",
            reference: "decision-1",
            relation: "AVAILABLE_CONTEXT",
            provenance: {
              source: "FOUNDER_MEMORY",
              kind: "CONTEXT",
            },
          },
        ]);
      },
    );

    it(
      "does not fabricate provenance for arbitrary memory values",
      () => {
        const traceMemory =
          projectTraceMemory({
            founder: {
              name: "Founder",
            },
            knowledge: [
              "Some internal note",
            ],
          });

        expect(
          traceMemory.references,
        ).toEqual([]);

        expect(
          traceMemory.provenance,
        ).toEqual({
          source: "FOUNDER_MEMORY",
          kind: "CONTEXT",
        });
      },
    );

    it(
      "marks missing memory as unavailable",
      () => {
        expect(
          projectTraceMemory(undefined),
        ).toEqual({
          available: false,
          categories: [],
          references: [],
          provenance: {
            source: "FOUNDER_MEMORY",
            kind: "CONTEXT",
          },
        });
      },
    );

    it(
      "does not copy full memory content into the trace",
      () => {
        const secret =
          "VERY-SENSITIVE-FOUNDER-DATA";

        const traceMemory =
          projectTraceMemory({
            founder: {
              name: secret,
            },
            company: {
              name: "Example",
            },
            goals: [
              {
                id: "goal-1",
                text: secret,
                completed: false,
              },
            ],
          });

        const serialized =
          JSON.stringify(traceMemory);

        expect(
          serialized.includes(secret),
        ).toBe(false);
      },
    );

    it(
      "keeps memory references separate from Knowledge evidence",
      () => {
        const memory = {
          goals: [
            {
              id: "goal-memory-1",
              text: CLAIM,
              completed: false,
            },
          ],
          decisions: [
            {
              id: "decision-memory-1",
              decision: CLAIM,
              date: "2026-09-20",
            },
          ],
        };

        const trace =
          buildDecisionTrace({
            traceId: "trace-memory-1",
            createdAt:
              "2026-09-20T00:00:00.000Z",
            input: {
              message: "What should we prioritize?",
            },
            strategicSignal:
              makeSignal(),
            memory,
            knowledge:
              makeKnowledge(),
            decision:
              makeDecision(),
          });

        expect(
          trace.memory.references,
        ).toEqual([
          {
            category: "goals",
            reference: "goal-memory-1",
            relation: "AVAILABLE_CONTEXT",
            provenance: {
              source: "FOUNDER_MEMORY",
              kind: "CONTEXT",
            },
          },
          {
            category: "decisions",
            reference: "decision-memory-1",
            relation: "AVAILABLE_CONTEXT",
            provenance: {
              source: "FOUNDER_MEMORY",
              kind: "CONTEXT",
            },
          },
        ]);

        expect(
          trace.decision.acceptedEvidence,
        ).toHaveLength(1);

        expect(
          trace.decision.acceptedEvidence[0].itemId,
        ).toBe("knowledge-v3175");

        expect(
          trace.decision.acceptedEvidence.some(
            (evidence) =>
              evidence.itemId ===
                "goal-memory-1" ||
              evidence.itemId ===
                "decision-memory-1",
          ),
        ).toBe(false);
      },
    );

    it(
      "does not let memory promote unverified knowledge",
      () => {
        const knowledge =
          makeKnowledge();

        knowledge.status =
          "UNVERIFIED";
        knowledge.classification =
          "UNKNOWN";
        knowledge.canUseAsTrustedContext =
          false;
        knowledge.facts = [];
        knowledge.unknowns = [CLAIM];
        knowledge.knowledgeConfidence = 40;
        knowledge.confidence = 40;
        knowledge.evidence = [
          {
            ...knowledge.evidence[0],
            status: "UNVERIFIED",
            confidence: 40,
          },
        ];

        const trace =
          buildDecisionTrace({
            traceId: "trace-memory-2",
            createdAt:
              "2026-09-20T00:00:00.000Z",
            input: {
              message: CLAIM,
            },
            strategicSignal:
              makeSignal(),
            memory: {
              knowledge: [CLAIM],
            },
            knowledge,
            decision: {
              output:
                makeDecision().output,
              metadata: {
                resolution:
                  "DETERMINISTIC_FALLBACK",
                fallbackReason:
                  "Knowledge was not verified.",
                validation: {
                  valid: false,
                  classification:
                    "UNKNOWN",
                  reason:
                    "Knowledge was not verified.",
                },
              },
            },
          });

        expect(
          trace.memory.available,
        ).toBe(true);

        expect(
          trace.decision.acceptedEvidence,
        ).toEqual([]);

        expect(
          trace.knowledge.classification,
        ).toBe("UNKNOWN");
      },
    );
  },
);

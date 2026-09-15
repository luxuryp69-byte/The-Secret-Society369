import { ceoAgent } from "../lib/agents/ceo";
import type { AgentKnowledgeContext } from "../lib/agents/knowledge/types";

type CEOOutput = {
  primaryPriority: string;
  why: string;
  plan: string[];
  successCriteria: string[];
  whatNotToPrioritize: string;
};

const neutralMessage =
  "La empresa está funcionando normalmente y queremos saber qué debería priorizar el CEO durante los próximos 30 días.";

function makeKnowledge(
  status:
    | "VERIFIED"
    | "UNVERIFIED"
    | "STALE"
    | "DISPUTED"
    | "REJECTED",
  canUseAsTrustedContext: boolean,
): AgentKnowledgeContext {
  const answer =
    status === "VERIFIED"
      ? "La empresa tiene dificultades para conseguir nuevos clientes."
      : null;

  return {
    query: "¿Cuál es la principal restricción comercial de la empresa?",
    availability:
      status === "VERIFIED"
        ? "AVAILABLE"
        : status === "DISPUTED" ||
            status === "REJECTED"
          ? "BLOCKED"
          : "WARNING",
    status,
    answer,
    confidence:
      status === "VERIFIED"
        ? 94
        : status === "DISPUTED"
          ? 80
          : 40,
    canUseAsTrustedContext,
    matchedItems: 1,
    sources:
      status === "VERIFIED"
        ? [
            {
              title: "Business Growth Report",
              publisher: "Example Research",
              url: "https://example.com/business-growth-report",
              type: "research",
            },
          ]
        : [],
    evidence:
      status === "VERIFIED"
        ? [
            {
              itemId: "knowledge-v3-14-verified",
              claim:
                "La empresa tiene dificultades para conseguir nuevos clientes.",
              status: "VERIFIED",
              confidence: 94,
              authorityScore: 90,
              corroborated: true,
              supportingSources: 2,
              conflictingSources: 0,
              reason:
                "La evidencia está verificada y corroborada.",
            },
          ]
        : [],
    candidates: [],
    warnings:
      status === "VERIFIED"
        ? []
        : [status],
    explanation:
      status === "VERIFIED"
        ? "Verified knowledge is available and can be used as trusted agent context."
        : `Knowledge status ${status} cannot be used as trusted agent context.`,
  };
}

function parseCEOOutput(raw: string): CEOOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `ceoAgent returned invalid JSON: ${raw}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "ceoAgent output must be a JSON object",
    );
  }

  const output =
    parsed as Record<string, unknown>;

  if (
    typeof output.primaryPriority !== "string" ||
    output.primaryPriority.trim() === ""
  ) {
    throw new Error(
      "primaryPriority must be a non-empty string",
    );
  }

  if (
    typeof output.why !== "string" ||
    output.why.trim() === ""
  ) {
    throw new Error(
      "why must be a non-empty string",
    );
  }

  if (
    !Array.isArray(output.plan) ||
    output.plan.length !== 3 ||
    !output.plan.every(
      (item) =>
        typeof item === "string" &&
        item.trim() !== "",
    )
  ) {
    throw new Error(
      "plan must contain exactly 3 non-empty strings",
    );
  }

  if (
    !Array.isArray(output.successCriteria) ||
    output.successCriteria.length !== 2 ||
    !output.successCriteria.every(
      (item) =>
        typeof item === "string" &&
        item.trim() !== "",
    )
  ) {
    throw new Error(
      "successCriteria must contain exactly 2 non-empty strings",
    );
  }

  if (
    typeof output.whatNotToPrioritize !== "string" ||
    output.whatNotToPrioritize.trim() === ""
  ) {
    throw new Error(
      "whatNotToPrioritize must be a non-empty string",
    );
  }

  return {
    primaryPriority:
      output.primaryPriority,
    why: output.why,
    plan: output.plan,
    successCriteria:
      output.successCriteria,
    whatNotToPrioritize:
      output.whatNotToPrioritize,
  };
}

async function testVerifiedKnowledgeReachesCEO() {
  const raw = await ceoAgent(
    neutralMessage,
    {
      memory: {},
      knowledge: makeKnowledge(
        "VERIFIED",
        true,
      ),
    },
  );

  const output = parseCEOOutput(raw);

  if (
    !output.primaryPriority
      .toLowerCase()
      .includes("demand")
  ) {
    throw new Error(
      [
        "Verified knowledge did not reach the CEO strategic decision.",
        `Expected demand priority, received: ${output.primaryPriority}`,
      ].join("\n"),
    );
  }

  console.log(
    "✅ VERIFIED knowledge reaches real ceoAgent flow",
  );
  console.log(
    `   priority: ${output.primaryPriority}`,
  );
}

async function testDisputedKnowledgeCannotReachCEOAsFact() {
  const raw = await ceoAgent(
    neutralMessage,
    {
      memory: {},
      knowledge: makeKnowledge(
        "DISPUTED",
        false,
      ),
    },
  );

  const output = parseCEOOutput(raw);

  if (
    !output.primaryPriority
      .toLowerCase()
      .includes("unknown")
  ) {
    throw new Error(
      [
        "Disputed knowledge incorrectly influenced the CEO strategic decision.",
        `Expected unknown priority, received: ${output.primaryPriority}`,
      ].join("\n"),
    );
  }

  if (
    output.primaryPriority
      .toLowerCase()
      .includes("demand")
  ) {
    throw new Error(
      "Disputed knowledge must never produce a demand priority.",
    );
  }

  console.log(
    "✅ DISPUTED knowledge is blocked from real ceoAgent decision",
  );
  console.log(
    `   priority: ${output.primaryPriority}`,
  );
}

async function testUnverifiedKnowledgeCannotReachCEOAsFact() {
  const raw = await ceoAgent(
    neutralMessage,
    {
      memory: {},
      knowledge: makeKnowledge(
        "UNVERIFIED",
        false,
      ),
    },
  );

  const output = parseCEOOutput(raw);

  if (
    !output.primaryPriority
      .toLowerCase()
      .includes("unknown")
  ) {
    throw new Error(
      [
        "Unverified knowledge incorrectly influenced the CEO strategic decision.",
        `Expected unknown priority, received: ${output.primaryPriority}`,
      ].join("\n"),
    );
  }

  console.log(
    "✅ UNVERIFIED knowledge is blocked from real ceoAgent decision",
  );
}

async function run() {
  let failures = 0;

  console.log(
    "\n👔 CEO AGENT KNOWLEDGE DECISION v3.14\n",
  );

  const tests = [
    [
      "verified knowledge",
      testVerifiedKnowledgeReachesCEO,
    ],
    [
      "disputed knowledge",
      testDisputedKnowledgeCannotReachCEOAsFact,
    ],
    [
      "unverified knowledge",
      testUnverifiedKnowledgeCannotReachCEOAsFact,
    ],
  ] as const;

  for (const [name, test] of tests) {
    try {
      await test();
    } catch (error) {
      failures += 1;

      console.error(`❌ ${name}`);

      if (error instanceof Error) {
        console.error(
          `   ${error.message}`,
        );
      } else {
        console.error(
          `   ${String(error)}`,
        );
      }
    }
  }

  console.log(
    `\n${
      failures === 0
        ? "✅ ALL CEO KNOWLEDGE DECISION v3.14 TESTS PASSED"
        : `❌ ${failures} CEO KNOWLEDGE DECISION v3.14 TEST(S) FAILED`
    }\n`,
  );

  process.exit(
    failures === 0 ? 0 : 1,
  );
}

run();

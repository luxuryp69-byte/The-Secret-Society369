import { createServer } from "node:http";

type KnowledgeStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "STALE"
  | "DISPUTED"
  | "REJECTED";

type AgentKnowledgeContext = {
  query: string;
  availability: "AVAILABLE" | "WARNING" | "BLOCKED" | "NO_MATCH";
  status: KnowledgeStatus | "NO_MATCH";
  answer: string | null;
  confidence: number;
  canUseAsTrustedContext: boolean;
  matchedItems: number;
  sources: Array<{
    title: string;
    publisher: string;
    url: string;
    type: string;
    publishedAt?: string;
    fetchedAt?: string;
    verifiedAt?: string;
  }>;
  evidence: Array<{
    itemId: string;
    claim: string;
    status: KnowledgeStatus;
    confidence: number;
    authorityScore: number;
    corroborated: boolean;
    supportingSources: number;
    conflictingSources: number;
    reason: string;
  }>;
  candidates: unknown[];
  warnings: string[];
  explanation: string;
};

function makeKnowledge(
  status: KnowledgeStatus,
  canUseAsTrustedContext: boolean,
): AgentKnowledgeContext {
  const verified =
    status === "VERIFIED" &&
    canUseAsTrustedContext;

  return {
    query: "situacion comercial de la empresa",
    availability: verified
      ? "AVAILABLE"
      : status === "DISPUTED" || status === "REJECTED"
        ? "BLOCKED"
        : "WARNING",
    status,
    answer: verified
      ? "La empresa tiene dificultades para conseguir nuevos clientes."
      : null,
    confidence: verified ? 94 : 0,
    canUseAsTrustedContext: verified,
    matchedItems: verified ? 1 : 0,
    sources: verified
      ? [
          {
            title: "Business Growth Report",
            publisher: "Example Research",
            url: "https://example.com/business-growth-report",
            type: "research",
            publishedAt: "2026-01-01T00:00:00.000Z",
            fetchedAt: "2026-01-02T00:00:00.000Z",
            verifiedAt: "2026-01-03T00:00:00.000Z",
          },
        ]
      : [],
    evidence: verified
      ? [
          {
            itemId: "knowledge-demand-1",
            claim:
              "La empresa tiene dificultades para conseguir nuevos clientes.",
            status: "VERIFIED",
            confidence: 94,
            authorityScore: 90,
            corroborated: true,
            supportingSources: 2,
            conflictingSources: 0,
            reason:
              "Evidence is verified and corroborated.",
          },
        ]
      : [],
    candidates: [],
    warnings: [],
    explanation: verified
      ? "Verified knowledge is available."
      : "Knowledge cannot be used as a trusted fact.",
  };
}

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`❌ ${message}`);
  }
}

function parseOutput(raw: string) {
  const parsed = JSON.parse(raw) as Record<
    string,
    unknown
  >;

  assert(
    typeof parsed.primaryPriority === "string",
    "primaryPriority must be a string",
  );

  assert(
    typeof parsed.why === "string",
    "why must be a string",
  );

  assert(
    Array.isArray(parsed.plan) &&
      parsed.plan.length === 3 &&
      parsed.plan.every(
        (item) => typeof item === "string",
      ),
    "plan must contain exactly 3 strings",
  );

  assert(
    Array.isArray(parsed.successCriteria) &&
      parsed.successCriteria.length === 2 &&
      parsed.successCriteria.every(
        (item) => typeof item === "string",
      ),
    "successCriteria must contain exactly 2 strings",
  );

  assert(
    typeof parsed.whatNotToPrioritize === "string",
    "whatNotToPrioritize must be a string",
  );

  return parsed;
}

const responses = [
  JSON.stringify({
    primaryPriority:
      "demand and acquisition — Generar demanda y adquirir clientes",
    why:
      "La evidencia verificada indica que la principal dificultad actual es conseguir nuevos clientes.",
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
  }),
  "not valid json",
];

let requestCount = 0;

const server = createServer(
  async (request, response) => {
    if (
      request.method !== "POST" ||
      request.url !== "/api/generate"
    ) {
      response.statusCode = 404;
      response.end();
      return;
    }

    requestCount += 1;

    await new Promise<void>((resolve) => {
      request.on("data", () => undefined);
      request.on("end", () => resolve());
    });

    const body =
      responses[
        Math.min(
          requestCount - 1,
          responses.length - 1,
        )
      ];

    response.writeHead(200, {
      "Content-Type": "application/json",
    });

    response.end(
      JSON.stringify({
        response: body,
        model: "test-ceo-v3-15",
      }),
    );
  },
);

await new Promise<void>((resolve) => {
  server.listen(0, "127.0.0.1", () => resolve());
});

const address = server.address();

if (
  typeof address !== "object" ||
  address === null ||
  !("port" in address)
) {
  throw new Error(
    "❌ Could not determine test server port",
  );
}

process.env.OLLAMA_URL =
  `http://127.0.0.1:${address.port}/api/generate`;

const { ceoAgent } = await import(
  "../lib/agents/ceo"
);

try {
  const verified =
    await ceoAgent(
      "¿Cuál debería ser nuestra prioridad?",
      {
        memory: {},
        knowledge: makeKnowledge(
          "VERIFIED",
          true,
        ),
      },
    );

  const verifiedOutput =
    parseOutput(verified);

  assert(
    String(
      verifiedOutput.primaryPriority,
    ).includes("demand"),
    "verified knowledge should produce demand priority",
  );

  assert(
    String(verifiedOutput.why)
      .toLowerCase()
      .includes("clientes"),
    "real CEO decision should use the knowledge-grounded commercial evidence",
  );

  const fallback =
    await ceoAgent(
      "¿Cuál debería ser nuestra prioridad?",
      {
        memory: {},
        knowledge: makeKnowledge(
          "VERIFIED",
          true,
        ),
      },
    );

  const fallbackOutput =
    parseOutput(fallback);

  assert(
    String(
      fallbackOutput.primaryPriority,
    ).includes("demand"),
    "invalid model output must fall back to the deterministic demand strategy",
  );

  console.log(
    "✅ ALL CEO REAL DECISION v3.15 TESTS PASSED",
  );
} finally {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

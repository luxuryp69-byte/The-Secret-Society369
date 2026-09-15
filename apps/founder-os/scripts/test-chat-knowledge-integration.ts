import { detectStrategicSignal } from "../lib/agents/ceo";
import type { AgentKnowledgeContext } from "../lib/agents/knowledge/types";

const memory = {
  founder: {
    name: "Founder",
  },
};

const knowledge: AgentKnowledgeContext = {
  query: "pipeline comercial",
  availability: "AVAILABLE",
  status: "VERIFIED",
  answer:
    "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.",
  confidence: 94,
  canUseAsTrustedContext: true,
  matchedItems: 1,
  candidates: [],
  sources: [
    {
      title: "Official Business Report",
      publisher: "Founder OS",
      url: "https://example.com/business-report",
      type: "official",
    },
  ],
  evidence: [
    {
      itemId: "strategic-demand-test",
      claim:
        "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.",
      status: "VERIFIED",
      confidence: 94,
      authorityScore: 90,
      corroborated: true,
      supportingSources: 2,
      conflictingSources: 0,
      reason:
        "High-authority source corroborated by independent evidence.",
    },
  ],
  warnings: [],
  explanation:
    "Verified knowledge is available and can be used as trusted agent context.",
};

const signal = detectStrategicSignal(
  "¿Cuál debería ser nuestra prioridad estratégica?",
  memory,
  knowledge,
);

console.log(
  JSON.stringify(
    {
      constraint: signal.constraint,
      confidence: signal.confidence,
      evidence: signal.evidence,
    },
    null,
    2,
  ),
);

if (signal.constraint !== "demand") {
  throw new Error(
    `Expected demand constraint, received ${signal.constraint}`,
  );
}

if (signal.confidence <= 0) {
  throw new Error("Expected positive confidence.");
}

console.log("🎉 Chat Knowledge Integration test passed.");

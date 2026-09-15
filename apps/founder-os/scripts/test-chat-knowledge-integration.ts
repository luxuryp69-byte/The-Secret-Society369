import { detectStrategicSignal } from "../lib/agents/ceo";

const memory = {
  founder: {
    name: "Founder",
  },
};

const knowledge = {
  status: "VERIFIED",
  query: "pipeline comercial",
  matchedItems: 1,
  trustedAnswer: {
    answer:
      "La empresa tiene un pipeline comercial casi vacío y está teniendo dificultades para conseguir nuevos clientes.",
    confidence: 94,
    status: "VERIFIED",
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
      "Verification status: VERIFIED. The claim is corroborated by independent evidence.",
  },
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

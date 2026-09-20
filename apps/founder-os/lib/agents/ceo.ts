import type { DecisionTrace } from "./decisionTrace/types";
import { randomUUID } from "node:crypto";

import { KnowledgeDecisionService } from "./knowledge/decision/knowledgeDecisionService";
import type {
  AgentKnowledgeDecisionContext,
  KnowledgeDecisionClassification,
  KnowledgeDecisionLLMMetadata,
  KnowledgeDecisionValidationResult,
} from "./knowledge/decision/types";
import {
  buildDecisionTrace,
  projectTraceEvidence,
} from "./decisionTrace/buildDecisionTrace";
import type {
  DecisionTraceResolution,
  TraceDecisionMetadata,
  TraceEvidenceReference,
} from "./decisionTrace/types";
import type {
  KnowledgeVerificationStatus,
} from "../knowledge/types";
import { askFast } from "../ai/ollama";

type CEOOutput = {
  primaryPriority: string;
  why: string;
  plan: [string, string, string];
  successCriteria: [string, string];
  whatNotToPrioritize: string;
};

type ParsedCEOJson = {
  output: CEOOutput;
  metadata?: KnowledgeDecisionLLMMetadata;
};

const CEO_JSON_SCHEMA = {
  type: "object" as const,
  additionalProperties: false as const,
  properties: {
    primaryPriority: {
      type: "string" as const,
      description: "Una única prioridad estratégica principal.",
    },
    why: {
      type: "string" as const,
      description:
        "Explicación breve basada exclusivamente en la evidencia proporcionada.",
    },
    plan: {
      type: "array" as const,
      minItems: 3,
      maxItems: 3,
      items: {
        type: "string" as const,
      },
      description:
        "Exactamente tres acciones concretas ejecutables durante los próximos 30 días.",
    },
    successCriteria: {
      type: "array" as const,
      minItems: 2,
      maxItems: 2,
      items: {
        type: "string" as const,
      },
      description:
        "Exactamente dos resultados medibles.",
    },
    whatNotToPrioritize: {
      type: "string" as const,
      description:
        "Una única iniciativa concreta que debe esperar durante estos 30 días.",
    },
    classification: {
      type: "string" as const,
      enum: [
        "FACT",
        "INFERENCE",
        "ASSUMPTION",
        "UNKNOWN",
      ],
      description:
        "Clasificación de la decisión respecto al conocimiento disponible.",
    },
    knowledgeConfidence: {
      type: "number" as const,
      description:
        "Confidence proveniente exclusivamente de Knowledge Layer.",
    },
    decisionConfidence: {
      type: "number" as const,
      minimum: 0,
      maximum: 100,
      description:
        "Confidence de esta decisión, separada de knowledgeConfidence.",
    },
    facts: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    inferences: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    assumptions: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    unknowns: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    evidence: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false as const,
        properties: {
          itemId: { type: "string" as const },
          claim: { type: "string" as const },
          sourceUrl: { type: "string" as const },
          confidence: { type: "number" as const },
          status: {
            type: "string" as const,
            enum: [
              "UNVERIFIED",
              "VERIFIED",
              "STALE",
              "DISPUTED",
              "REJECTED",
              ],
          },
        },
        required: [
          "itemId",
          "claim",
          "sourceUrl",
          "status",
        ] as string[],
      },
    },
    sources: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    warnings: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
  required: [
    "primaryPriority",
    "why",
    "plan",
    "successCriteria",
    "whatNotToPrioritize",
  ] as string[],
};

type CEOContext = {
  memory?: unknown;
  knowledge?: unknown;
  onDecisionTrace?: (trace: DecisionTrace) => void;
};

type TrustAwareKnowledgeSource = {
  title?: unknown;
  publisher?: unknown;
  url?: unknown;
  type?: unknown;
  publishedAt?: unknown;
  fetchedAt?: unknown;
  verifiedAt?: unknown;
};

type TrustAwareKnowledgeEvidence = {
  itemId?: unknown;
  claim?: unknown;
  status?: unknown;
  confidence?: unknown;
  authorityScore?: unknown;
  corroborated?: unknown;
  supportingSources?: unknown;
  conflictingSources?: unknown;
  reason?: unknown;
};

type TrustAwareKnowledgeContext = {
  canUseAsTrustedContext?: boolean;
  availability?: string;
  answer?: unknown;
  sources?: unknown;
  evidence?: unknown;
};

type StrategicConstraint =
  | "product"
  | "retention"
  | "demand"
  | "capital"
  | "execution"
  | "unknown";

export type StrategicSignal = {
  constraint: StrategicConstraint;
  evidence: string[];
  confidence: number;
};

function constraintPriority(
  constraint: StrategicConstraint,
): number {
  switch (constraint) {
    case "capital":
      return 6;

    case "product":
      return 5;

    case "retention":
      return 4;

    case "demand":
      return 3;

    case "execution":
      return 2;

    case "unknown":
      return 0;
  }
}

function clampConfidence(
  confidence: number,
): number {
  return Math.max(0, Math.min(100, confidence));
}

function signalScore(
  signal: StrategicSignal,
): number {
  return (
    clampConfidence(signal.confidence) * 100 +
    constraintPriority(signal.constraint)
  );
}

export function selectHigherPrioritySignal(
  signals: StrategicSignal[],
): StrategicSignal {
  if (signals.length === 0) {
    return {
      constraint: "unknown",
      evidence: [
        "No existe evidencia suficiente para identificar un cuello de botella dominante.",
      ],
      confidence: 0,
    };
  }

  return signals.reduce((winner, candidate) => {
    const winnerScore = signalScore(winner);
    const candidateScore = signalScore(candidate);

    if (candidateScore > winnerScore) {
      return candidate;
    }

    return winner;
  });
}

const MAX_CONTEXT_CHARS = 12000;

function formatContext(value: unknown): string {
  if (value === null || value === undefined) {
    return "No additional context available.";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "No additional context available.";
  }

  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized || "No additional context available.";
  } catch {
    return "Context could not be serialized.";
  }
}

function formatTrustedKnowledgeContext(
  value: unknown,
): string {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return "No trusted knowledge context available.";
  }

  const context =
    value as TrustAwareKnowledgeContext;

  if (context.canUseAsTrustedContext !== true) {
    return "No trusted knowledge context available.";
  }

  if (
    typeof context.answer !== "string" ||
    !context.answer.trim()
  ) {
    return "No trusted knowledge context available.";
  }

  return context.answer.trim();
}

function formatTrustedKnowledgeSources(
  value: unknown,
): string {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return "No trusted knowledge sources available.";
  }

  const context =
    value as TrustAwareKnowledgeContext;

  if (context.canUseAsTrustedContext !== true) {
    return "No trusted knowledge sources available.";
  }

  if (!Array.isArray(context.sources) || context.sources.length === 0) {
    return "No trusted knowledge sources available.";
  }

  const sources = context.sources
    .filter(
      (source): source is TrustAwareKnowledgeSource =>
        typeof source === "object" &&
        source !== null,
    )
    .map((source) => {
      const title =
        typeof source.title === "string"
          ? source.title.trim()
          : "";

      const publisher =
        typeof source.publisher === "string"
          ? source.publisher.trim()
          : "";

      const url =
        typeof source.url === "string"
          ? source.url.trim()
          : "";

      const type =
        typeof source.type === "string"
          ? source.type.trim()
          : "";

      const publishedAt =
        typeof source.publishedAt === "string"
          ? source.publishedAt.trim()
          : "";

      const fetchedAt =
        typeof source.fetchedAt === "string"
          ? source.fetchedAt.trim()
          : "";

      const verifiedAt =
        typeof source.verifiedAt === "string"
          ? source.verifiedAt.trim()
          : "";

      const parts = [
        title && `title=${title}`,
        publisher && `publisher=${publisher}`,
        type && `type=${type}`,
        url && `url=${url}`,
        publishedAt && `publishedAt=${publishedAt}`,
        fetchedAt && `fetchedAt=${fetchedAt}`,
        verifiedAt && `verifiedAt=${verifiedAt}`,
      ].filter(Boolean);

      return parts.length > 0
        ? `- ${parts.join(" | ")}`
        : null;
    })
    .filter((source): source is string => source !== null);

  return sources.length > 0
    ? sources.join("\n")
    : "No trusted knowledge sources available.";
}

function formatTrustedKnowledgeEvidence(
  value: unknown,
): string {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return "No trusted knowledge evidence available.";
  }

  const context =
    value as TrustAwareKnowledgeContext;

  if (context.canUseAsTrustedContext !== true) {
    return "No trusted knowledge evidence available.";
  }

  if (!Array.isArray(context.evidence) || context.evidence.length === 0) {
    return "No trusted knowledge evidence available.";
  }

  const evidence = context.evidence
    .filter(
      (item): item is TrustAwareKnowledgeEvidence =>
        typeof item === "object" &&
        item !== null,
    )
    .map((item) => {
      const claim =
        typeof item.claim === "string"
          ? item.claim.trim()
          : "";

      const status =
        typeof item.status === "string"
          ? item.status.trim()
          : "";

      const confidence =
        typeof item.confidence === "number"
          ? String(item.confidence)
          : "";

      const authorityScore =
        typeof item.authorityScore === "number"
          ? String(item.authorityScore)
          : "";

      const corroborated =
        typeof item.corroborated === "boolean"
          ? String(item.corroborated)
          : "";

      const supportingSources =
        typeof item.supportingSources === "number"
          ? String(item.supportingSources)
          : "";

      const conflictingSources =
        typeof item.conflictingSources === "number"
          ? String(item.conflictingSources)
          : "";

      const reason =
        typeof item.reason === "string"
          ? item.reason.trim()
          : "";

      const parts = [
        typeof item.itemId === "string" &&
          item.itemId.trim() &&
          `itemId=${item.itemId.trim()}`,
        claim && `claim=${claim}`,
        status && `status=${status}`,
        confidence && `confidence=${confidence}`,
        authorityScore && `authorityScore=${authorityScore}`,
        corroborated && `corroborated=${corroborated}`,
        supportingSources &&
          `supportingSources=${supportingSources}`,
        conflictingSources &&
          `conflictingSources=${conflictingSources}`,
        reason && `reason=${reason}`,
      ].filter(Boolean);

      return parts.length > 0
        ? `- ${parts.join(" | ")}`
        : null;
    })
    .filter((item): item is string => item !== null);

  return evidence.length > 0
    ? evidence.join("\n")
    : "No trusted knowledge evidence available.";
}

function formatNonTrustedKnowledge(
  decision: AgentKnowledgeDecisionContext,
): string {
  if (decision.classification === "FACT") {
    return "No non-trusted knowledge warnings.";
  }

  const parts = [
    `availability=${decision.availability}`,
    `status=${decision.status}`,
    `warnings=${decision.warnings.join(", ") || "none"}`,
    `explanation=${decision.explanation}`,
  ];

  if (
    (
      decision.status === "STALE" ||
      decision.status === "UNVERIFIED"
    ) &&
    decision.answer !== null
  ) {
    parts.push(
      `nonTrustedCandidate=${decision.answer}`,
    );
  }

  return parts.join(" | ");
}

function truncateContext(value: string): string {
  if (value.length <= MAX_CONTEXT_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_CONTEXT_CHARS)}\n[Context truncated]`;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parsePercent(value: string): number | null {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*%/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1].replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

const PRODUCT_SIGNAL_TERMS = [
  "respuestas genericas",
  "respuestas demasiado genericas",
  "respuesta generica",
  "producto inestable",
  "problemas de producto",
  "problemas importantes de estabilidad",
  "problemas de estabilidad",
  "problemas de calidad",
  "bugs",
  "errores",
  "poco valor",
  "producto no entrega",
  "producto no cumple",
] as const;

const PRODUCT_RELIABILITY_TERMS = [
  "recomendaciones inconsistentes",
  "respuestas inconsistentes",
  "producto inconsistente",
  "respuestas superficiales",
  "demasiado superficiales",
  "recomendaciones superficiales",
] as const;

function includesAny(
  text: string,
  terms: readonly string[],
): boolean {
  return terms.some((term) =>
    text.includes(term),
  );
}

function isAgentKnowledgeContext(
  value: unknown,
): boolean {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const context =
    value as Record<string, unknown>;

  return (
    typeof context.query === "string" &&
    typeof context.availability === "string" &&
    typeof context.status === "string" &&
    typeof context.canUseAsTrustedContext === "boolean" &&
    typeof context.confidence === "number" &&
    (
      context.answer === null ||
      typeof context.answer === "string"
    ) &&
    Array.isArray(context.sources) &&
    Array.isArray(context.evidence)
  );
}

export function detectStrategicSignal(
  message: string,
  memory: unknown,
  knowledge: unknown,
): StrategicSignal {
  const normalizedMessage = normalize(message);

  const knowledgeDecision =
    isAgentKnowledgeContext(knowledge)
      ? new KnowledgeDecisionService().createContext(
          knowledge,
        )
      : null;

  const trustedKnowledge =
    knowledgeDecision?.classification === "FACT"
      ? knowledgeDecision.facts.join("\n")
      : "";

  const legacyKnowledge =
    knowledgeDecision === null
      ? formatContext(knowledge)
      : "";

  const combined = normalize(
    [
      message,
      formatContext(memory),
      legacyKnowledge,
      trustedKnowledge,
    ].join("\n"),
  );

  const evidence: string[] = [];

  const churnMatch = combined.match(
    /churn["'\s:=]+(\d+(?:[.,]\d+)?)\s*%/,
  );

  const churn =
    churnMatch
      ? Number(churnMatch[1].replace(",", "."))
      : parsePercent(
          combined.match(/churn.{0,80}/)?.[0] ?? "",
        );

  const pipelineEmpty =
    combined.includes("pipeline") &&
    (
      combined.includes("casi vacio") ||
      combined.includes("vacio") ||
      combined.includes("empty") ||
      combined.includes("sin pipeline")
    );

  const demandLanguage =
    combined.includes("pipeline casi vacio") ||
    combined.includes("pipeline vacio") ||
    combined.includes("sin pipeline") ||
    combined.includes("pocos clientes") ||
    combined.includes("falta de clientes") ||
    combined.includes("no conseguimos clientes") ||
    combined.includes("no logramos clientes") ||
    combined.includes("no llegan clientes") ||
    combined.includes("dificultad para conseguir clientes") ||
    /dificultades? para (?:conseguir|adquirir) (?:nuevos? )?clientes/.test(
      combined,
    ) ||
    combined.includes("dificultad para adquirir clientes") ||
    combined.includes("demanda insuficiente") ||
    combined.includes("falta de demanda") ||
    combined.includes("sin demanda");

  const retentionLanguage =
    combined.includes("abandono temprano") ||
    combined.includes("alto abandono") ||
    combined.includes("mucho abandono") ||
    combined.includes("clientes abandonan") ||
    combined.includes("clientes están abandonando") ||
    combined.includes("clientes estan abandonando") ||
    combined.includes("perdiendo clientes") ||
    combined.includes("pierden clientes") ||
    combined.includes("cancelaciones han aumentado") ||
    combined.includes("muchas cancelaciones") ||
    combined.includes("retencion baja") ||
    combined.includes("baja retencion") ||
    combined.includes("retencion deficiente") ||
    combined.includes("retencion pobre") ||
    combined.includes("problema de retencion") ||
    combined.includes("problemas de retencion");

  const productProblemLanguage =
    includesAny(
      combined,
      PRODUCT_SIGNAL_TERMS,
    ) ||
    includesAny(
      combined,
      PRODUCT_RELIABILITY_TERMS,
    ) ||
    (
      combined.includes("producto") &&
      (
        combined.includes("inconsistente") ||
        combined.includes("superficial") ||
        combined.includes("generico") ||
        combined.includes("generica") ||
        combined.includes("deficiente") ||
        combined.includes("problema") ||
        combined.includes("problemas") ||
        combined.includes("falla") ||
        combined.includes("fallas") ||
        combined.includes("no funciona") ||
        combined.includes("no resuelve")
      )
    ) ||
    (
      combined.includes("respuestas") &&
      (
        combined.includes("genericas") ||
        combined.includes("superficiales") ||
        combined.includes("inconsistentes") ||
        combined.includes("poco profundas")
      )
    ) ||
    (
      combined.includes("recomendaciones estrategicas") &&
      (
        combined.includes("superficiales") ||
        combined.includes("genericas") ||
        combined.includes("inconsistentes") ||
        combined.includes("poco profundas")
      )
    );

  const runwayMatch =
    combined.match(
      /runway["'\s:=]+(\d+(?:[.,]\d+)?)\s*(mes|meses|month|months)?/,
    ) ??
    combined.match(
      /(\d+(?:[.,]\d+)?)\s*(mes|meses|month|months)\s*(?:de\s*)?runway/,
    );

  const runwayMonths =
    runwayMatch
      ? Number(runwayMatch[1].replace(",", "."))
      : null;

  const messageProductSignal =
    includesAny(
      normalizedMessage,
      PRODUCT_SIGNAL_TERMS,
    ) ||
    normalizedMessage.includes("producto demasiado generico") ||
    normalizedMessage.includes("demasiado generico") ||
    normalizedMessage.includes("no resuelve bien sus necesidades") ||
    normalizedMessage.includes("no resuelve sus necesidades");

  const messageProductReliabilitySignal =
    includesAny(
      normalizedMessage,
      PRODUCT_RELIABILITY_TERMS,
    );

  const messageExecutionSignal =
    (
      normalizedMessage.includes("equipo") &&
      (
        normalizedMessage.includes("sobrecargado") ||
        normalizedMessage.includes("sobrecarga") ||
        normalizedMessage.includes("sin capacidad") ||
        normalizedMessage.includes("capacidad limitada") ||
        normalizedMessage.includes("falta de capacidad") ||
        normalizedMessage.includes("capacidad de ejecucion")
      )
    ) ||
    normalizedMessage.includes("demasiadas iniciativas abiertas") ||
    normalizedMessage.includes("prioridades cambian constantemente") ||
    normalizedMessage.includes("proyectos criticos no se terminan");

  const messageRetentionUrgencySignal =
    normalizedMessage.includes("perdiendo clientes") ||
    normalizedMessage.includes("perdiendo muchos clientes") ||
    normalizedMessage.includes("estamos perdiendo muchos clientes") ||
    normalizedMessage.includes("clientes demasiado rapido") ||
    normalizedMessage.includes("clientes muy rapido") ||
    normalizedMessage.includes("no permanecen") ||
    normalizedMessage.includes("abandono temprano") ||
    normalizedMessage.includes("churn ha aumentado") ||
    normalizedMessage.includes("churn aumento");

  const messageRetentionSignal =
    normalizedMessage.includes("abandono temprano") ||
    normalizedMessage.includes("alto abandono") ||
    normalizedMessage.includes("mucho abandono") ||
    normalizedMessage.includes("clientes abandonan") ||
    normalizedMessage.includes("clientes estan abandonando") ||
    normalizedMessage.includes("perdiendo clientes") ||
    normalizedMessage.includes("pierden clientes") ||
    normalizedMessage.includes("cancelaciones han aumentado") ||
    normalizedMessage.includes("muchas cancelaciones") ||
    normalizedMessage.includes("retencion baja") ||
    normalizedMessage.includes("baja retencion") ||
    normalizedMessage.includes("retencion deficiente") ||
    normalizedMessage.includes("retencion pobre") ||
    normalizedMessage.includes("problema de retencion") ||
    normalizedMessage.includes("problemas de retencion") ||
    (
      normalizedMessage.includes("churn") &&
      churn !== null &&
      churn >= 8
    );

  const messageDemandSignal =
    normalizedMessage.includes("pipeline casi vacio") ||
    normalizedMessage.includes("pipeline vacio") ||
    normalizedMessage.includes("sin pipeline") ||
    normalizedMessage.includes("pocos clientes") ||
    normalizedMessage.includes("falta de clientes") ||
    normalizedMessage.includes("conseguir clientes") ||
    normalizedMessage.includes("conseguir cliente") ||
    normalizedMessage.includes("adquisicion de clientes");

  const messageCapitalSignal =
    (
      runwayMonths !== null &&
      runwayMonths <= 6 &&
      normalizedMessage.includes("runway")
    ) ||
    (
      normalizedMessage.includes("menos de tres meses") &&
      normalizedMessage.includes("runway")
    ) ||
    (
      normalizedMessage.includes("menos de seis meses") &&
      normalizedMessage.includes("runway")
    ) ||
    normalizedMessage.includes("preservar caja") ||
    normalizedMessage.includes("preservar efectivo") ||
    (
      normalizedMessage.includes("burn alto") &&
      normalizedMessage.includes("runway")
    );

  const messageSignals: StrategicSignal[] = [];

  if (messageCapitalSignal) {
    messageSignals.push({
      constraint: "capital",
      evidence: [
        `Runway corto detectado en el mensaje actual: ${runwayMonths} meses.`,
      ],
      confidence:
        runwayMonths !== null && runwayMonths <= 3
          ? 100
          : 90,
    });
  }

  if (
    messageProductSignal ||
    messageProductReliabilitySignal
  ) {
    messageSignals.push({
      constraint: "product",
      evidence: [
        "El mensaje actual contiene evidencia directa de problemas de producto, calidad o valor.",
      ],
      confidence:
        messageProductReliabilitySignal
          ? 90
          : 80,
    });
  }

  if (messageExecutionSignal) {
    messageSignals.push({
      constraint: "execution",
      evidence: [
        "El mensaje actual contiene evidencia directa de una restricción de capacidad o ejecución.",
      ],
      confidence: 80,
    });
  }

  if (
    messageRetentionSignal ||
    messageRetentionUrgencySignal
  ) {
    messageSignals.push({
      constraint: "retention",
      evidence: [
        churn !== null
          ? `Churn detectado en el mensaje actual: ${churn}%.`
          : "El mensaje actual menciona explícitamente retención o abandono.",
      ],
      confidence:
        churn !== null && churn >= 15
          ? 95
          : churn !== null && churn >= 8
            ? 90
            : messageRetentionUrgencySignal
              ? 85
              : 75,
    });
  }

  if (messageDemandSignal) {
    messageSignals.push({
      constraint: "demand",
      evidence: [
        "El mensaje actual contiene evidencia directa de una restricción de demanda o adquisición.",
      ],
      confidence:
        normalizedMessage.includes("pipeline casi vacio") ||
        normalizedMessage.includes("pipeline vacio") ||
        normalizedMessage.includes("sin pipeline")
          ? 90
          : 75,
    });
  }

  if (messageSignals.length > 0) {
    return selectHigherPrioritySignal(messageSignals);
  }

  // -------------------------------------------------------
  // Context signals: memory + knowledge
  //
  // Unlike direct message signals, contextual evidence may
  // contain multiple simultaneous constraints. Collect every
  // candidate first, then resolve the winner deterministically
  // by confidence and strategic priority.
  // -------------------------------------------------------

  const contextSignals: StrategicSignal[] = [];

  if (
    retentionLanguage ||
    (churn !== null && churn >= 8)
  ) {
    const contextEvidence: string[] = [
      churn !== null
        ? `Churn detectado: ${churn}%.`
        : "El contexto menciona explícitamente retención o abandono.",
    ];

    if (
      combined.includes("satisfechos") &&
      combined.includes("abandon")
    ) {
      contextEvidence.push(
        "Los clientes que permanecen están satisfechos, pero existe abandono temprano.",
      );
    }

    contextSignals.push({
      constraint: "retention",
      evidence: contextEvidence,
      confidence:
        churn !== null && churn >= 15
          ? 95
          : churn !== null && churn >= 8
            ? 90
            : 85,
    });
  }

  if (
    productProblemLanguage ||
    (
      combined.includes("inconsistente") &&
      (
        combined.includes("respuesta") ||
        combined.includes("respuestas") ||
        combined.includes("recomendacion") ||
        combined.includes("recomendaciones") ||
        combined.includes("calidad") ||
        combined.includes("superficial")
      )
    )
  ) {
    contextSignals.push({
      constraint: "product",
      evidence: [
        "El contexto contiene evidencia directa de problemas de producto, calidad, fiabilidad o consistencia.",
      ],
      confidence: 85,
    });
  }

  if (pipelineEmpty || demandLanguage) {
    const contextEvidence: string[] = [
      "El contexto indica una restricción de demanda o adquisición.",
    ];

    if (pipelineEmpty) {
      contextEvidence.push(
        "El pipeline comercial está casi vacío o vacío.",
      );
    }

    if (churn !== null && churn < 5) {
      contextEvidence.push(
        `Churn bajo: ${churn}%, por lo que retención no parece ser el cuello de botella principal.`,
      );
    }

    contextSignals.push({
      constraint: "demand",
      evidence: contextEvidence,
      confidence: pipelineEmpty ? 90 : 80,
    });
  }

  if (
    runwayMonths !== null &&
    runwayMonths <= 6
  ) {
    contextSignals.push({
      constraint: "capital",
      evidence: [
        `Runway corto detectado: ${runwayMonths} meses.`,
      ],
      confidence:
        runwayMonths <= 3
          ? 100
          : 95,
    });
  }

  const executionLanguage =
    (
      combined.includes("equipo") &&
      (
        combined.includes("sobrecargado") ||
        combined.includes("sobrecarga") ||
        combined.includes("sin capacidad") ||
        combined.includes("capacidad limitada") ||
        combined.includes("falta de capacidad") ||
        combined.includes("recursos limitados")
      )
    ) ||
    combined.includes("demasiadas iniciativas abiertas") ||
    combined.includes("prioridades cambian constantemente") ||
    combined.includes("proyectos criticos no se terminan") ||
    combined.includes("cuello de botella de ejecucion");

  if (executionLanguage) {
    contextSignals.push({
      constraint: "execution",
      evidence: [
        "El contexto contiene evidencia directa de una restricción de capacidad, foco o ejecución.",
      ],
      confidence: 75,
    });
  }

  return selectHigherPrioritySignal(contextSignals);
}

function strategicInstruction(
  constraint: StrategicConstraint,
): string {
  switch (constraint) {
    case "product":
      return "Haz de producto, calidad, profundidad, especificidad y valor la única prioridad.";

    case "retention":
      return "Haz de retención la única prioridad. Usa evidencia de churn, abandono o permanencia.";

    case "demand":
      return "Haz de demanda y adquisición la única prioridad. No sustituyas esta prioridad por producto o fundraising.";

    case "capital":
      return "Haz de caja, liquidez y runway la única prioridad. Enfócate en preservar caja y extender runway.";

    case "execution":
      return "Haz de ejecución, capacidad y foco la única prioridad. Reduce trabajo simultáneo y bloqueos.";

    case "unknown":
      return "No inventes un cuello de botella. La prioridad debe ser obtener evidencia suficiente para tomar una decisión.";
  }
}

export function buildCEOUserPrompt(
  message: string,
  memory: unknown,
  knowledge: unknown,
  signal: StrategicSignal,
): string {
  const evidence = signal.evidence
    .map((item) => `- ${item}`)
    .join("\n");

  const memoryContext = truncateContext(
    formatContext(memory),
  );

  const knowledgeContext = truncateContext(
    formatTrustedKnowledgeContext(knowledge),
  );

  const knowledgeSources = truncateContext(
    formatTrustedKnowledgeSources(knowledge),
  );

  const knowledgeEvidence = truncateContext(
    formatTrustedKnowledgeEvidence(knowledge),
  );

  const knowledgeDecision =
    new KnowledgeDecisionService().createContext(
      knowledge,
    );

  const knowledgeDecisionContext =
    truncateContext(
      [
          `classification=${knowledgeDecision.classification}`,
          `status=${knowledgeDecision.status}`,
          `confidence=${knowledgeDecision.confidence}`,
          `knowledgeConfidence=${knowledgeDecision.knowledgeConfidence}`,
          `facts=${knowledgeDecision.facts.join(" | ") || "none"}`,
          `unknowns=${knowledgeDecision.unknowns.join(" | ") || "none"}`,
        ].join("\n"),
    );

  const nonTrustedKnowledge = truncateContext(
    formatNonTrustedKnowledge(
      knowledgeDecision,
    ),
  );

  return `You are the CEO and strategic decision-maker of Founder OS.

Make ONE high-leverage executive decision.

The detected strategic constraint is authoritative for this decision.
Use the full context to understand the company and make the recommendation more specific, but do not override the detected constraint unless the evidence is internally contradictory.

DETECTED CONSTRAINT

${signal.constraint}

DETECTED EVIDENCE

${evidence}

STRATEGIC INSTRUCTION

${strategicInstruction(signal.constraint)}

FOUNDER MEMORY

${memoryContext}

RELEVANT KNOWLEDGE

${knowledgeContext}

VERIFIED KNOWLEDGE

${knowledgeDecision.classification === "FACT" ? knowledgeContext : "No verified facts are available."}

NON-TRUSTED KNOWLEDGE AND WARNINGS

${nonTrustedKnowledge}

KNOWLEDGE SOURCES

${knowledgeSources}

KNOWLEDGE EVIDENCE

${knowledgeEvidence}

KNOWLEDGE DECISION CONTEXT

${knowledgeDecisionContext}

FOUNDER REQUEST

${message}

Return JSON matching the supplied schema.

Requirements:

- primaryPriority: exactly one strategic priority
- why: concise explanation grounded in the evidence and context
- plan: exactly 3 concrete actions executable within the next 30 days
- successCriteria: exactly 2 measurable outcomes
- whatNotToPrioritize: exactly 1 concrete initiative that should wait 30 days

Decision rules:

- Prefer specific company facts over generic startup advice.
- Do not invent metrics, customers, revenue, churn, runway, or company facts.
- VERIFIED evidence may be used as FACT only when it is present in the Knowledge Decision Context.
- STALE and UNVERIFIED knowledge are not current facts; use them only as warnings or clearly labelled inference.
- DISPUTED and REJECTED knowledge are blocked and must not be used as trusted evidence.
- NO_MATCH means UNKNOWN; do not fabricate a fact to fill the gap.
- Every cited evidence itemId and source URL must exist in the supplied Knowledge Layer context.
- Do not invent claims, sources, URLs, confidence, or provenance.
- If a metric is unknown, define how it should be measured instead of fabricating a number.
- The three actions must directly support the same primary priority.
- The success criteria must be objectively measurable.
- whatNotToPrioritize must be a real tradeoff relative to the chosen priority.
- Do not recommend multiple competing top priorities.

Grounding metadata, when supplied, must include:

- classification: FACT, INFERENCE, ASSUMPTION, or UNKNOWN
- knowledgeConfidence: copy the Knowledge Layer value; never increase it
- decisionConfidence: your decision confidence from 0 to 100, separate from knowledgeConfidence
- facts, inferences, assumptions, unknowns: keep these categories distinct
- evidence: cite only supplied itemId values and matching claims/statuses
- sources: cite only supplied source URLs

All values must be in Spanish.

For every string value:

- Do not use numbering.
- Do not include headings.
- Do not include field names.
- Do not use Markdown.
- Do not include "30-DAY PLAN", "SUCCESS CRITERIA", "Success Criteria", "initiative_to_wait_for_30_days".
- Do not include "1.", "2.", "3.", "**" or "#".

Do not add fields.
Do not explain or repeat the schema.`;
}

function hasOwn(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key,
  );
}

function parseOptionalStringArray(
  value: Record<string, unknown>,
  key: string,
): string[] | null | undefined {
  if (!hasOwn(value, key)) {
    return undefined;
  }

  if (!Array.isArray(value[key])) {
    return null;
  }

  const items = value[key] as unknown[];

  if (
    items.some(
      (item) =>
        typeof item !== "string" ||
        item.trim() === "",
    )
  ) {
    return null;
  }

  return items.map((item) =>
    (item as string).trim(),
  );
}

function parseOptionalCEOClassification(
  value: Record<string, unknown>,
): KnowledgeDecisionClassification | null | undefined {
  if (!hasOwn(value, "classification")) {
    return undefined;
  }

  if (
    value.classification !== "FACT" &&
    value.classification !== "INFERENCE" &&
    value.classification !== "ASSUMPTION" &&
    value.classification !== "UNKNOWN"
  ) {
    return null;
  }

  return value.classification;
}

function parseOptionalCEOEvidence(
  value: Record<string, unknown>,
): KnowledgeDecisionLLMMetadata["evidence"] | null | undefined {
  if (!hasOwn(value, "evidence")) {
    return undefined;
  }

  if (!Array.isArray(value.evidence)) {
    return null;
  }

  const allowedStatuses: KnowledgeVerificationStatus[] = [
    "UNVERIFIED",
    "VERIFIED",
    "STALE",
    "DISPUTED",
    "REJECTED",
  ];

  const citations: NonNullable<KnowledgeDecisionLLMMetadata["evidence"]> = [];

  for (const item of value.evidence) {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      return null;
    }

    const citation = item as Record<string, unknown>;

    if (
      typeof citation.itemId !== "string" ||
      citation.itemId.trim() === ""
    ) {
      return null;
    }

    const parsed = {
      itemId: citation.itemId.trim(),
    } as NonNullable<KnowledgeDecisionLLMMetadata["evidence"]>[number];

    for (const key of ["claim", "sourceUrl"] as const) {
      if (!hasOwn(citation, key)) {
        continue;
      }

      if (
        typeof citation[key] !== "string" ||
        citation[key].trim() === ""
      ) {
        return null;
      }

      parsed[key] = citation[key].trim();
    }

    if (hasOwn(citation, "confidence")) {
      if (
        typeof citation.confidence !== "number" ||
        !Number.isFinite(citation.confidence)
      ) {
        return null;
      }

      parsed.confidence = citation.confidence;
    }

    if (hasOwn(citation, "status")) {
      if (
        typeof citation.status !== "string" ||
        !allowedStatuses.includes(
          citation.status as KnowledgeVerificationStatus,
        )
      ) {
        return null;
      }

      parsed.status = citation.status as KnowledgeVerificationStatus;
    }

    citations.push(parsed);
  }

  return citations;
}

function parseCEOJsonMetadata(
  value: Record<string, unknown>,
): KnowledgeDecisionLLMMetadata | null | undefined {
  const classification =
    parseOptionalCEOClassification(value);

  if (classification === null) {
    return null;
  }

  const metadata: KnowledgeDecisionLLMMetadata = {};
  let present = classification !== undefined;

  if (classification !== undefined) {
    metadata.classification = classification;
  }

  for (const key of [
    "facts",
    "inferences",
    "assumptions",
    "unknowns",
    "warnings",
  ] as const) {
    const parsed = parseOptionalStringArray(
      value,
      key,
    );

    if (parsed === null) {
      return null;
    }

    if (parsed !== undefined) {
      metadata[key] = parsed;
      present = true;
    }
  }

  const evidence = parseOptionalCEOEvidence(value);

  if (evidence === null) {
    return null;
  }

  if (evidence !== undefined) {
    metadata.evidence = evidence;
    present = true;
  }

  if (hasOwn(value, "sources")) {
    const sources = parseOptionalStringArray(
      value,
      "sources",
    );

    if (sources === null) {
      return null;
    }

    metadata.sources = sources ?? [];
    present = true;
  }

  for (const key of [
    "knowledgeConfidence",
    "decisionConfidence",
  ] as const) {
    if (!hasOwn(value, key)) {
      continue;
    }

    if (
      typeof value[key] !== "number" ||
      !Number.isFinite(value[key])
    ) {
      return null;
    }

    metadata[key] = value[key] as number;
    present = true;
  }

  return present ? metadata : undefined;
}

function parseCEOJson(raw: string): ParsedCEOJson | null {
  try {
    const parsed = JSON.parse(raw) as Partial<CEOOutput>;

    if (
      typeof parsed.primaryPriority !== "string" ||
      typeof parsed.why !== "string" ||
      typeof parsed.whatNotToPrioritize !== "string"
    ) {
      return null;
    }

    if (
      !Array.isArray(parsed.plan) ||
      parsed.plan.length !== 3 ||
      parsed.plan.some(
        (item) => typeof item !== "string",
      )
    ) {
      return null;
    }

    if (
      !Array.isArray(parsed.successCriteria) ||
      parsed.successCriteria.length !== 2 ||
      parsed.successCriteria.some(
        (item) => typeof item !== "string",
      )
    ) {
      return null;
    }

    const primaryPriority =
      parsed.primaryPriority.trim();

    const why =
      parsed.why.trim();

    const plan = parsed.plan.map(
      (item) => item.trim(),
    ) as [string, string, string];

    const successCriteria =
      parsed.successCriteria.map(
        (item) => item.trim(),
      ) as [string, string];

    const whatNotToPrioritize =
      parsed.whatNotToPrioritize.trim();

    const fields = [
      primaryPriority,
      why,
      ...plan,
      ...successCriteria,
      whatNotToPrioritize,
    ];

    if (
      fields.some(
        (item) => item.length === 0,
      )
    ) {
      return null;
    }

    const combined = normalize(
      fields.join("\n"),
    );

    const forbiddenMarkers = [
      "success criteria:",
      "initiative_to_wait_for_30_days",
      "primary priority:",
      "30-day plan:",
      "what not to prioritize:",
      "**success criteria",
      "**primary priority",
      "```",
    ];

    if (
      forbiddenMarkers.some(
        (marker) =>
          combined.includes(
            normalize(marker),
          ),
      )
    ) {
      console.warn(
        "⚠️ CEO STRUCTURED OUTPUT | formatting contamination detected",
      );

      return null;
    }

    if (
      plan.some(
        (item) =>
          /^\s*\d+\.\s*/.test(item),
      )
    ) {
      console.warn(
        "⚠️ CEO STRUCTURED OUTPUT | plan numbering contamination detected",
      );

      return null;
    }

    if (
      successCriteria.some(
        (item) =>
          /^\s*\d+\.\s*/.test(item),
      )
    ) {
      console.warn(
        "⚠️ CEO STRUCTURED OUTPUT | criteria numbering contamination detected",
      );

      return null;
    }

    const metadata = parseCEOJsonMetadata(
      parsed as Record<string, unknown>,
    );

    if (metadata === null) {
      return null;
    }

    return {
      output: {
        primaryPriority,
        why,
        plan,
        successCriteria,
        whatNotToPrioritize,
      },
      ...(metadata !== undefined
        ? { metadata }
        : {}),
    };
  } catch {
    return null;
  }
}

function hasStrategicEvidence(
  result: CEOOutput,
  signal: StrategicSignal,
): boolean {
  const evidence = normalize(
    `${result.primaryPriority} ${result.why}`,
  );

  const termsByConstraint: Record<
    StrategicConstraint,
    string[]
  > = {
    product: [
      "producto",
      "calidad",
      "valor",
      "respuesta",
      "especificidad",
      "profundidad",
      "accionabilidad",
    ],

    retention: [
      "retencion",
      "churn",
      "abandono",
      "retener",
    ],

    demand: [
      "demanda",
      "clientes",
      "adquisicion",
      "pipeline",
      "prospectos",
      "ventas",
    ],

    capital: [
      "capital",
      "runway",
      "liquidez",
      "caja",
      "efectivo",
      "burn",
      "financiacion",
    ],

    execution: [
      "ejecucion",
      "capacidad",
      "equipo",
      "prioridades",
      "foco",
      "bloqueos",
    ],

    unknown: [
      "evidencia",
      "cuello de botella",
      "suposicion",
      "hipotesis",
    ],
  };

  const hits =
    termsByConstraint[
      signal.constraint
    ].filter((term) =>
      evidence.includes(
        normalize(term),
      ),
    );

  return signal.constraint === "capital"
    ? hits.length >= 1
    : hits.length >= 2;
}

const STRATEGIC_PRIORITY_LABELS: Record<
  StrategicConstraint,
  string
> = {
  product:
    "product — Mejorar la calidad del producto",

  retention:
    "retention — Mejorar la retención",

  demand:
    "demand and acquisition — Generar demanda y adquirir clientes",

  capital:
    "capital — Preservar caja y extender el runway",

  execution:
    "execution — Eliminar el cuello de botella de ejecución",

  unknown:
    "unknown — Obtener evidencia suficiente para identificar el cuello de botella dominante",
};

function normalizeStrategicPriority(
  result: CEOOutput,
  signal: StrategicSignal,
): CEOOutput {
  return {
    ...result,
    primaryPriority:
      STRATEGIC_PRIORITY_LABELS[
        signal.constraint
      ],
  };
}


const ACTIONABLE_PLAN_TERMS = [
  "analizar",
  "identificar",
  "definir",
  "crear",
  "implementar",
  "ejecutar",
  "medir",
  "revisar",
  "reducir",
  "aumentar",
  "priorizar",
  "contactar",
  "eliminar",
  "concentrar",
  "construir",
  "auditar",
  "corregir",
  "pausar",
  "evaluar",
  "mejorar",
  "optimizar",
  "establecer",
  "asignar",
  "renegociar",
  "completar",
  "validar",
  "documentar",
  "lanzar",
  "probar",
];

const CONCRETE_DEPRIORITIZATION_TERMS = [
  "producto",
  "marketing",
  "fundraising",
  "capital",
  "adquisicion",
  "ventas",
  "funcionalidades",
  "features",
  "expansion",
  "contratacion",
  "nuevas iniciativas",
  "nuevas funcionalidades",
  "equipo",
];

function hasActionablePlanItems(
  plan: string[],
): boolean {
  if (plan.length !== 3) {
    return false;
  }

  return plan.every(
    (item) =>
      ACTIONABLE_PLAN_TERMS.some(
        (term) =>
          normalize(item).includes(
            normalize(term),
          ),
      ),
  );
}

function hasConcreteDeprioritization(
  value: string,
): boolean {
  const normalized = normalize(value);

  if (normalized.length < 20) {
    return false;
  }

  return CONCRETE_DEPRIORITIZATION_TERMS.some(
    (term) =>
      normalized.includes(
        normalize(term),
      ),
  );
}

function normalizeCEOOutput(
  result: CEOOutput,
  signal: StrategicSignal,
): CEOOutput {
  const fallback = strategicFallback(signal);

  const normalizedPriority =
    normalizeStrategicPriority(
      result,
      signal,
    );

  return {
    ...normalizedPriority,

    plan:
      hasActionablePlanItems(
        normalizedPriority.plan,
      )
        ? normalizedPriority.plan
        : fallback.plan,

    successCriteria:
      normalizedPriority.successCriteria.length === 2
        ? normalizedPriority.successCriteria
        : fallback.successCriteria,

    whatNotToPrioritize:
      hasConcreteDeprioritization(
        normalizedPriority.whatNotToPrioritize,
      )
        ? normalizedPriority.whatNotToPrioritize
        : fallback.whatNotToPrioritize,
  };
}


export function strategicFallback(
  signal: StrategicSignal,
): CEOOutput {
  const primaryPriority =
    STRATEGIC_PRIORITY_LABELS[
      signal.constraint
    ];

  switch (signal.constraint) {
    case "product":
      return {
        primaryPriority,

        why:
          "La evidencia indica que las respuestas todavía pueden ser demasiado genéricas, por lo que la calidad del producto es el cuello de botella.",

        plan: [
          "Crear un conjunto de casos ejecutivos reales con respuestas objetivo.",
          "Evaluar cada respuesta por profundidad, especificidad y accionabilidad.",
          "Corregir los patrones débiles y repetir la evaluación hasta lograr consistencia.",
        ],

        successCriteria: [
          "Al menos 80% de los casos alcanza la puntuación objetivo al día 30.",
          "Reducir en 50% las respuestas clasificadas como genéricas al día 30.",
        ],

        whatNotToPrioritize:
          "No priorizar fundraising ni expansión comercial durante estos 30 días.",
      };

    case "retention":
      return {
        primaryPriority,

        why:
          "El churn y el abandono son la restricción dominante y limitan el valor del crecimiento actual.",

        plan: [
          "Analizar las principales causas de abandono.",
          "Identificar en qué etapa ocurre la pérdida de clientes.",
          "Corregir primero las dos causas de abandono con mayor impacto.",
        ],

        successCriteria: [
          "Reducir el churn en al menos 2 puntos porcentuales al día 30.",
          "Identificar las 3 principales causas de abandono antes del día 14.",
        ],

        whatNotToPrioritize:
          "No priorizar expansión agresiva de adquisición durante estos 30 días.",
      };

    case "demand":
      return {
        primaryPriority,

        why:
          "El pipeline comercial es insuficiente mientras la retención no muestra señales de ser el cuello de botella principal.",

        plan: [
          "Definir el cliente ideal y construir una lista de 100 prospectos cualificados.",
          "Ejecutar contacto comercial diario sobre los prospectos prioritarios.",
          "Medir semanalmente respuestas, reuniones y oportunidades generadas.",
        ],

        successCriteria: [
          "Generar al menos 30 conversaciones comerciales cualificadas en 30 días.",
          "Crear al menos 10 oportunidades comerciales nuevas antes del día 30.",
        ],

        whatNotToPrioritize:
          "No priorizar fundraising durante estos 30 días.",
      };

    case "capital":
      return {
        primaryPriority,

        why:
          "Con un runway corto, preservar liquidez es la restricción que domina todas las demás decisiones.",

        plan: [
          "Revisar todos los gastos y eliminar los que no sean esenciales.",
          "Renegociar los principales costes recurrentes dentro de los primeros 14 días.",
          "Construir un plan semanal de caja y evaluar financiación adicional.",
        ],

        successCriteria: [
          "Reducir el burn mensual en al menos 15% antes del día 30.",
          "Extender el runway proyectado en al menos 1 mes antes del día 30.",
        ],

        whatNotToPrioritize:
          "No priorizar nuevas iniciativas de expansión que aumenten el burn durante estos 30 días.",
      };

    case "execution":
      return {
        primaryPriority,

        why:
          "La capacidad limitada y las prioridades simultáneas están impidiendo completar los objetivos críticos.",

        plan: [
          "Reducir las iniciativas activas a un máximo de 3 prioridades.",
          "Asignar un único responsable y fecha límite a cada prioridad.",
          "Eliminar reuniones y tareas que no contribuyan directamente a esas prioridades.",
        ],

        successCriteria: [
          "Reducir en 50% el número de iniciativas simultáneas antes del día 7.",
          "Completar al menos 80% de los entregables críticos antes del día 30.",
        ],

        whatNotToPrioritize:
          "No iniciar nuevas iniciativas de marketing durante estos 30 días.",
      };

    default:
      return {
        primaryPriority,

        why:
          "El contexto actual no permite justificar con seguridad una prioridad única.",

        plan: [
          "Medir demanda, retención, valor del producto, caja y capacidad.",
          "Identificar la métrica que más limita el resultado.",
          "Concentrar el siguiente ciclo en esa restricción.",
        ],

        successCriteria: [
          "Identificar un cuello de botella dominante antes del día 14.",
          "Definir una métrica principal y una decisión basada en ella antes del día 30.",
        ],

        whatNotToPrioritize:
          "No priorizar iniciativas grandes sin evidencia de que atacan la restricción principal.",
      };
  }
}

function normalizeCEOFormatting(
  text: string,
): string {
  return text.replace(
    /^(\s*)(\d+)\.\s+\2\.\s+/gm,
    "$1$2. ",
  );
}

function shouldUseLLMDecisionLayer(): boolean {
  const mode =
    process.env.FOUNDER_OS_CEO_DECISION_MODE ??
    "auto";

  if (mode === "llm") {
    return true;
  }

  if (mode === "deterministic") {
    return false;
  }

  return process.env.NODE_ENV !== "test";
}

function projectValidatedAcceptedEvidence(
  knowledge: AgentKnowledgeDecisionContext,
  metadata: KnowledgeDecisionLLMMetadata | undefined,
  validation: KnowledgeDecisionValidationResult | undefined,
): TraceEvidenceReference[] {
  if (
    validation?.valid !== true ||
    metadata?.evidence === undefined
  ) {
    return [];
  }

  const evidenceById = new Map(
    knowledge.evidence.map((evidence) => [
      evidence.itemId,
      evidence,
    ]),
  );

  return metadata.evidence.flatMap((citation) => {
    const evidence = evidenceById.get(
      citation.itemId,
    );

    return evidence === undefined
      ? []
      : [projectTraceEvidence(evidence)];
  });
}

function createTraceDecisionMetadata(
  resolution: DecisionTraceResolution,
  knowledge: AgentKnowledgeDecisionContext,
  metadata: KnowledgeDecisionLLMMetadata | undefined,
  validation: KnowledgeDecisionValidationResult | undefined,
  finalLLMDecision: boolean,
  fallbackReason?: string,
): TraceDecisionMetadata {
  const traceMetadata: TraceDecisionMetadata = {
    resolution,
  };

  if (
    finalLLMDecision &&
    metadata?.classification !== undefined
  ) {
    traceMetadata.classification =
      metadata.classification;
  }

  if (
    finalLLMDecision &&
    metadata?.decisionConfidence !== undefined
  ) {
    traceMetadata.decisionConfidence =
      metadata.decisionConfidence;
  }

  if (finalLLMDecision) {
    traceMetadata.acceptedEvidence =
      projectValidatedAcceptedEvidence(
        knowledge,
        metadata,
        validation,
      );

    for (const key of [
      "inferences",
      "assumptions",
      "unknowns",
      "warnings",
    ] as const) {
      const values = metadata?.[key];

      if (values !== undefined) {
        traceMetadata[key] = [...values];
      }
    }
  }

  if (validation !== undefined) {
    traceMetadata.validation = validation;
  }

  if (fallbackReason !== undefined) {
    traceMetadata.fallbackReason =
      fallbackReason;
  }

  return traceMetadata;
}

function buildInternalDecisionTrace(
  message: string,
  signal: StrategicSignal,
  knowledge: AgentKnowledgeDecisionContext,
  output: CEOOutput,
  metadata: TraceDecisionMetadata,
  onDecisionTrace?: (trace: DecisionTrace) => void,): void {
  try {
    const trace = buildDecisionTrace({
      traceId: randomUUID(),
      createdAt: new Date().toISOString(),
      input: { message },
      strategicSignal: signal,
      knowledge,
      decision: {
        output,
        metadata,
      },
    });
    onDecisionTrace?.(trace);

  } catch {
    // Decision Trace is lateral audit output and must not alter CEO output.
  }
}

export async function ceoAgent(
  message: string,
  context: CEOContext = {},
): Promise<string> {
  const memory = context.memory;
  const knowledge = context.knowledge;
  const onDecisionTrace = context.onDecisionTrace;

  const signal = detectStrategicSignal(
    message,
    memory,
    knowledge,
  );

  const knowledgeDecision =
    new KnowledgeDecisionService().createContext(
      knowledge,
    );

  console.log("\n👔 CEO Agent");
  console.log("🧠 CEO Mode | STRATEGIC");
  console.log(
    `📋 CEO Context | memory=${
      memory !== undefined ? "yes" : "no"
    } | knowledge=${
      knowledge !== undefined ? "yes" : "no"
    }`,
  );

  console.log(
    `🎯 CEO Constraint | ${signal.constraint}`,
  );

  console.log(
    `🧠 CEO Knowledge | availability=${knowledgeDecision.availability} | classification=${knowledgeDecision.classification} | evidence=${knowledgeDecision.evidence.length}`,
  );

  const fallback =
    strategicFallback(
      signal,
    );

  if (!shouldUseLLMDecisionLayer()) {
    console.log(
      `⚡ CEO deterministic decision layer | ${signal.constraint}`,
    );

    buildInternalDecisionTrace(
      message,
      signal,
      knowledgeDecision,
      fallback,
      createTraceDecisionMetadata(
        "DETERMINISTIC_FALLBACK",
        knowledgeDecision,
        undefined,
        undefined,
        false,
        "LLM decision layer was not used.",
      ),

    onDecisionTrace,
);

    return JSON.stringify(fallback);
  }

  const prompt = buildCEOUserPrompt(
    message,
    memory,
    knowledge,
    signal,
  );

  console.log(
    `🧠 CEO decision layer | constraint=${signal.constraint} | prompt=${prompt.length} chars`,
  );

  try {
    const raw = await askFast(
      prompt,
      {
        temperature: 0.2,
        num_predict: 512,
        format: CEO_JSON_SCHEMA,
      },
    );

    const parsedResult = parseCEOJson(raw);

    if (parsedResult === null) {
      console.warn(
        "⚠️ CEO DECISION | invalid structured output; using deterministic fallback",
      );

      console.log(
        `⚡ CEO deterministic fallback | ${signal.constraint}`,
      );

      buildInternalDecisionTrace(
        message,
        signal,
        knowledgeDecision,
        fallback,
        createTraceDecisionMetadata(
          "DETERMINISTIC_FALLBACK",
          knowledgeDecision,
          undefined,
          undefined,
          false,
          "LLM returned invalid JSON.",
        ),

      onDecisionTrace,
);

      return JSON.stringify(fallback);
    }

    const validation =
      new KnowledgeDecisionService().validateLLMDecision(
        knowledgeDecision,
        parsedResult.metadata,
      );

    console.log(
      `🧠 CEO Decision Validation | valid=${validation.valid} | classification=${validation.classification}`,
    );

    if (!validation.valid) {
      console.warn(
        `⚠️ CEO DECISION | knowledge boundary violation; using deterministic fallback: ${validation.reason}`,
      );

      console.log(
        `⚡ CEO deterministic fallback | ${signal.constraint}`,
      );

      buildInternalDecisionTrace(
        message,
        signal,
        knowledgeDecision,
        fallback,
        createTraceDecisionMetadata(
          "DETERMINISTIC_FALLBACK",
          knowledgeDecision,
          parsedResult.metadata,
          validation,
          false,
          validation.reason,
        ),

      onDecisionTrace,
);

      return JSON.stringify(fallback);
    }

    const parsed = parsedResult.output;

    if (!hasStrategicEvidence(parsed, signal)) {
      console.warn(
        "⚠️ CEO DECISION | output lacks evidence for detected constraint; using deterministic fallback",
      );

      console.log(
        `⚡ CEO deterministic fallback | ${signal.constraint}`,
      );

      buildInternalDecisionTrace(
        message,
        signal,
        knowledgeDecision,
        fallback,
        createTraceDecisionMetadata(
          "DETERMINISTIC_FALLBACK",
          knowledgeDecision,
          parsedResult.metadata,
          validation,
          false,
          "Accepted LLM output lacked evidence for the detected strategic constraint.",
        ),

      onDecisionTrace,
);

      return JSON.stringify(fallback);
    }

    const normalized = normalizeCEOOutput(
      parsed,
      signal,
    );

    console.log(
      `✅ CEO decision accepted | ${signal.constraint}`,
    );

    buildInternalDecisionTrace(
      message,
      signal,
      knowledgeDecision,
      normalized,
      createTraceDecisionMetadata(
        "LLM",
        knowledgeDecision,
        parsedResult.metadata,
        validation,
        true,
      ),

    onDecisionTrace,
);

    return JSON.stringify(normalized);
  } catch (error) {
    console.error(
      "❌ CEO DECISION | provider failure; using deterministic fallback",
      error,
    );

    console.log(
      `⚡ CEO deterministic fallback | ${signal.constraint}`,
    );

    buildInternalDecisionTrace(
      message,
      signal,
      knowledgeDecision,
      fallback,
      createTraceDecisionMetadata(
        "DETERMINISTIC_FALLBACK",
        knowledgeDecision,
        undefined,
        undefined,
        false,
        "CEO decision provider failed.",
      ),

    onDecisionTrace,
);

    return JSON.stringify(fallback);
  }
}

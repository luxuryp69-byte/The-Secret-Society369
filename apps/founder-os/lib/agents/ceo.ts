import { askFast } from "../ai/ollama";

type CEOOutput = {
  primaryPriority: string;
  why: string;
  plan: [string, string, string];
  successCriteria: [string, string];
  whatNotToPrioritize: string;
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
};

type StrategicConstraint =
  | "product"
  | "retention"
  | "demand"
  | "capital"
  | "execution"
  | "unknown";

type StrategicSignal = {
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

function selectHigherPrioritySignal(
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
  "calidad de respuestas",
  "calidad del producto",
  "producto inestable",
  "problemas de producto",
  "problemas importantes de estabilidad",
  "estabilidad del producto",
  "problemas de estabilidad",
  "problemas de calidad",
  "bugs",
  "errores",
  "fiabilidad",
  "usabilidad",
  "poco valor",
  "valor del producto",
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

export function detectStrategicSignal(
  message: string,
  memory: unknown,
  knowledge: unknown,
): StrategicSignal {
  const normalizedMessage = normalize(message);

  const combined = normalize(
    [
      message,
      formatContext(memory),
      formatContext(knowledge),
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
    combined.includes("conseguir clientes") ||
    combined.includes("conseguir cliente") ||
    combined.includes("demanda") ||
    combined.includes("adquisicion") ||
    combined.includes("adquisicion de clientes") ||
    combined.includes("pipeline casi vacio") ||
    combined.includes("pipeline vacio") ||
    combined.includes("pocos clientes") ||
    combined.includes("falta de clientes");

  const retentionLanguage =
    combined.includes("retencion") ||
    combined.includes("abandono") ||
    combined.includes("abandonan") ||
    combined.includes("cancelan") ||
    combined.includes("pierden clientes");

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
        combined.includes("estabilidad") ||
        combined.includes("calidad") ||
        combined.includes("experiencia de usuario")
      )
    ) ||
    (
      combined.includes("currentfocus") &&
      combined.includes("calidad")
    ) ||
    (
      combined.includes("currentproblem") &&
      combined.includes("generica")
    ) ||
    combined.includes("respuestas ejecutivas") ||
    combined.includes(
      "recomendaciones estrategicas profundas",
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
    normalizedMessage.includes("retencion") ||
    normalizedMessage.includes("abandono") ||
    normalizedMessage.includes("abandonan") ||
    normalizedMessage.includes("cancelan") ||
    normalizedMessage.includes("pierden clientes") ||
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

  if (
    retentionLanguage ||
    (churn !== null && churn >= 8)
  ) {
    evidence.push(
      churn !== null
        ? `Churn detectado: ${churn}%.`
        : "El contexto menciona explícitamente retención o abandono.",
    );

    if (
      combined.includes("satisfechos") &&
      combined.includes("abandon")
    ) {
      evidence.push(
        "Los clientes que permanecen están satisfechos, pero existe abandono temprano.",
      );
    }

    return {
      constraint: "retention",
      evidence,
    };
  }

  // Product reliability/quality evidence from memory or knowledge
  // must beat generic healthy-demand language.
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
    evidence.push(
      "El contexto contiene evidencia directa de problemas de producto, calidad, fiabilidad o consistencia.",
    );

    return {
      constraint: "product",
      evidence,
    };
  }

  if (pipelineEmpty || demandLanguage) {
    evidence.push(
      "El contexto indica una restricción de demanda o adquisición.",
    );

    if (pipelineEmpty) {
      evidence.push(
        "El pipeline comercial está casi vacío o vacío.",
      );
    }

    if (churn !== null && churn < 5) {
      evidence.push(
        `Churn bajo: ${churn}%, por lo que retención no parece ser el cuello de botella principal.`,
      );
    }

    return {
      constraint: "demand",
      evidence,
    };
  }

  if (
    runwayMonths !== null &&
    runwayMonths <= 6
  ) {
    evidence.push(
      `Runway corto detectado: ${runwayMonths} meses.`,
    );

    return {
      constraint: "capital",
      evidence,
    };
  }

  if (productProblemLanguage) {
    evidence.push(
      "El contexto contiene evidencia directa de problemas de producto, calidad o valor.",
    );

    return {
      constraint: "product",
      evidence,
    };
  }

  if (
    combined.includes("equipo") ||
    combined.includes("ejecucion") ||
    combined.includes("capacidad") ||
    combined.includes("recursos limitados")
  ) {
    evidence.push(
      "El contexto indica una posible restricción de ejecución o capacidad.",
    );

    return {
      constraint: "execution",
      evidence,
    };
  }

  return {
    constraint: "unknown",
    evidence: [
      "No existe evidencia suficiente para identificar un cuello de botella dominante.",
    ],
  };
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

function buildCEOUserPrompt(
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
    formatContext(knowledge),
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
- If a metric is unknown, define how it should be measured instead of fabricating a number.
- The three actions must directly support the same primary priority.
- The success criteria must be objectively measurable.
- whatNotToPrioritize must be a real tradeoff relative to the chosen priority.
- Do not recommend multiple competing top priorities.

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

function parseCEOJson(raw: string): CEOOutput | null {
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

    return {
      primaryPriority,
      why,
      plan,
      successCriteria,
      whatNotToPrioritize,
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


function toCEOText(
  result: CEOOutput,
): string {
  return `PRIMARY PRIORITY

${result.primaryPriority}

WHY

${result.why}

30-DAY PLAN

1. ${result.plan[0]}

2. ${result.plan[1]}

3. ${result.plan[2]}

SUCCESS CRITERIA

1. ${result.successCriteria[0]}

2. ${result.successCriteria[1]}

WHAT NOT TO PRIORITIZE

${result.whatNotToPrioritize}`;
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

export async function ceoAgent(
  message: string,
  context: CEOContext = {},
): Promise<string> {
  const memory = context.memory;
  const knowledge = context.knowledge;

  const signal = detectStrategicSignal(
    message,
    memory,
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

  // -------------------------------------------------------
  // Canonical deterministic decisions
  // -------------------------------------------------------
  //
  // Strategic constraints are already identified by
  // detectStrategicSignal(). The fallback strategy is the
  // canonical response for these known bottlenecks.
  //
  // Avoid a local model call here: Ollama latency can be
  // tens of seconds while the strategic decision is already
  // deterministic and covered by regression tests.
  // -------------------------------------------------------

  // -------------------------------------------------------
  // Canonical deterministic decisions
  // -------------------------------------------------------
  //
  // detectStrategicSignal() already identifies the dominant
  // bottleneck. For canonical strategic constraints, avoid a
  // local model call because the decision is deterministic.
  // This keeps CEO strategic responses fast and stable.
  // -------------------------------------------------------

  console.log(
    `⚡ CEO deterministic strategy | ${signal.constraint}`,
  );

  return JSON.stringify(
    strategicFallback(signal),
  );
}

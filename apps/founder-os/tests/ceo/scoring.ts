import type {
  CEOBenchmarkCase,
  StrategicConstraint,
} from "./cases";

export type CEOScore = {
  constraintCorrect: boolean;
  hasAllSections: boolean;
  strategicEvidence: boolean;
  singlePriority: boolean;
  actionablePlan: boolean;
  measurableCriteria: boolean;
  hasConcreteDeprioritization: boolean;
  total: number;
};

export type ParsedCEOResponse = {
  primaryPriority: string;
  why: string;
  plan: string[];
  successCriteria: string[];
  whatNotToPrioritize: string;
};

const TERMS: Record<StrategicConstraint, string[]> = {
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
};

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
] as const;

const MEASURABLE_TERMS = [
  "dia",
  "dias",
  "semana",
  "semanas",
  "mes",
  "meses",
  "clientes",
  "leads",
  "pipeline",
  "churn",
  "retencion",
  "runway",
  "ingresos",
  "burn",
  "tiempo",
  "conversion",
  "conversiones",
  "usuarios",
  "activacion",
  "activaciones",
] as const;

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
] as const;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export function parseCEOResponse(
  output: string,
): ParsedCEOResponse | null {
  try {
    const parsed = JSON.parse(output) as Record<
      string,
      unknown
    >;

    if (
      !isNonEmptyString(parsed.primaryPriority) ||
      !isNonEmptyString(parsed.why) ||
      !isNonEmptyString(parsed.whatNotToPrioritize)
    ) {
      return null;
    }

    if (
      !Array.isArray(parsed.plan) ||
      parsed.plan.length !== 3 ||
      !parsed.plan.every(isNonEmptyString)
    ) {
      return null;
    }

    if (
      !Array.isArray(parsed.successCriteria) ||
      parsed.successCriteria.length !== 2 ||
      !parsed.successCriteria.every(isNonEmptyString)
    ) {
      return null;
    }

    return {
      primaryPriority: parsed.primaryPriority.trim(),
      why: parsed.why.trim(),
      plan: parsed.plan.map((item) =>
        item.trim(),
      ),
      successCriteria: parsed.successCriteria.map(
        (item) => item.trim(),
      ),
      whatNotToPrioritize:
        parsed.whatNotToPrioritize.trim(),
    };
  } catch {
    return null;
  }
}

export function hasAllSections(
  response: ParsedCEOResponse | null,
): boolean {
  if (!response) {
    return false;
  }

  return (
    response.primaryPriority.length > 0 &&
    response.why.length > 0 &&
    response.plan.length === 3 &&
    response.successCriteria.length === 2 &&
    response.whatNotToPrioritize.length > 0
  );
}

export function detectConstraintFromOutput(
  response: ParsedCEOResponse | null,
): StrategicConstraint | null {
  if (!response) {
    return null;
  }

  const evidence = normalize(
    `${response.primaryPriority} ${response.why}`,
  );

  const scores = (
    Object.entries(TERMS) as Array<
      [StrategicConstraint, string[]]
    >
  ).map(([constraint, terms]) => ({
    constraint,
    score: terms.filter((term) =>
      evidence.includes(normalize(term)),
    ).length,
  }));

  scores.sort(
    (a, b) => b.score - a.score,
  );

  if (scores[0].score === 0) {
    return null;
  }

  if (
    scores.length > 1 &&
    scores[0].score === scores[1].score
  ) {
    return null;
  }

  return scores[0].constraint;
}

export function hasStrategicEvidence(
  response: ParsedCEOResponse | null,
  expectedConstraint: StrategicConstraint,
): boolean {
  if (!response) {
    return false;
  }

  const evidence = normalize(
    `${response.primaryPriority} ${response.why}`,
  );

  const hits = TERMS[
    expectedConstraint
  ].filter((term) =>
    evidence.includes(normalize(term)),
  );

  return expectedConstraint === "capital"
    ? hits.length >= 1
    : hits.length >= 2;
}

export function hasSinglePriority(
  response: ParsedCEOResponse | null,
): boolean {
  if (!response) {
    return false;
  }

  const priority =
    response.primaryPriority.trim();

  if (!priority) {
    return false;
  }

  const competingPatterns = [
    /\by\s+(?:mejorar|conseguir|levantar|desarrollar|aumentar|reducir)\b/i,
    /\bademas\b/i,
    /\btambien\b/i,
    /\bpor otro lado\b/i,
    /\balternativamente\b/i,
    /\bpor una parte\b/i,
    /\bpor otra parte\b/i,
  ];

  return competingPatterns.every(
    (pattern) => !pattern.test(priority),
  );
}

export function hasActionablePlan(
  response: ParsedCEOResponse | null,
): boolean {
  if (
    !response ||
    response.plan.length !== 3
  ) {
    return false;
  }

  return response.plan.every((action) => {
    const normalizedAction =
      normalize(action);

    return ACTIONABLE_PLAN_TERMS.some(
      (term) =>
        normalizedAction.includes(
          normalize(term),
        ),
    );
  });
}

export function hasMeasurableCriteria(
  response: ParsedCEOResponse | null,
): boolean {
  if (
    !response ||
    response.successCriteria.length !== 2
  ) {
    return false;
  }

  return response.successCriteria.every(
    (criterion) => {
      const normalizedCriterion =
        normalize(criterion);

      return (
        /\d|%/.test(normalizedCriterion) ||
        MEASURABLE_TERMS.some((term) =>
          normalizedCriterion.includes(
            normalize(term),
          ),
        )
      );
    },
  );
}

export function hasConcreteDeprioritization(
  response: ParsedCEOResponse | null,
): boolean {
  if (!response) {
    return false;
  }

  const text = normalize(
    response.whatNotToPrioritize.trim(),
  );

  if (text.length < 20) {
    return false;
  }

  return CONCRETE_DEPRIORITIZATION_TERMS.some(
    (term) =>
      text.includes(normalize(term)),
  );
}

export function scoreCEOResponse(
  testCase: CEOBenchmarkCase,
  output: string,
): CEOScore {
  const parsed =
    parseCEOResponse(output);

  const detectedConstraint =
    detectConstraintFromOutput(parsed);

  const constraintCorrect =
    detectedConstraint ===
    testCase.expectedConstraint;

  const allSections =
    hasAllSections(parsed);

  const strategicEvidence =
    hasStrategicEvidence(
      parsed,
      testCase.expectedConstraint,
    );

  const singlePriority =
    hasSinglePriority(parsed);

  const actionablePlan =
    hasActionablePlan(parsed);

  const measurableCriteria =
    hasMeasurableCriteria(parsed);

  const concreteDeprioritization =
    hasConcreteDeprioritization(parsed);

  const checks = [
    constraintCorrect,
    allSections,
    strategicEvidence,
    singlePriority,
    actionablePlan,
    measurableCriteria,
    concreteDeprioritization,
  ];

  return {
    constraintCorrect,
    hasAllSections: allSections,
    strategicEvidence,
    singlePriority,
    actionablePlan,
    measurableCriteria,
    hasConcreteDeprioritization:
      concreteDeprioritization,
    total: checks.filter(Boolean).length,
  };
}

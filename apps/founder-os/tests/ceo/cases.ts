export type StrategicConstraint =
  | "product"
  | "retention"
  | "demand"
  | "capital"
  | "execution";

export type CEOBenchmarkCase = {
  id: string;
  name: string;
  message: string;
  memory: Record<string, unknown>;
  knowledge: Record<string, unknown>;
  expectedConstraint: StrategicConstraint;
};

export const CEO_BENCHMARK_CASES: CEOBenchmarkCase[] = [
  {
    id: "product-01",
    name: "Generic CEO responses",
    message:
      "Las respuestas del CEO siguen siendo demasiado genéricas. ¿Qué deberíamos mejorar primero?",
    memory: {
      product: "Founder OS",
      churn: "4%",
      pipeline: "fuerte",
      runway: "16 meses",
    },
    knowledge: {
      currentProblem:
        "Los usuarios consideran útiles las respuestas, pero necesitan más profundidad, especificidad y accionabilidad.",
    },
    expectedConstraint: "product",
  },
  {
    id: "product-02",
    name: "Response reliability",
    message:
      "Tenemos usuarios y demanda, pero las recomendaciones todavía son inconsistentes. ¿Dónde pondrías el foco?",
    memory: {
      revenue: "$30k MRR",
      growth: "6% MoM",
      churn: "4%",
      pipeline: "fuerte",
      product: "estable pero inconsistente",
    },
    knowledge: {
      qualityIssue:
        "Algunas respuestas son excelentes y otras demasiado superficiales para decisiones ejecutivas.",
    },
    expectedConstraint: "product",
  },

  {
    id: "retention-01",
    name: "Early churn",
    message:
      "Estamos creciendo, pero muchos clientes abandonan durante los primeros meses. ¿En qué deberíamos enfocarnos?",
    memory: {
      revenue: "$40k MRR",
      growth: "8% MoM",
      churn: "12%",
      runway: "14 meses",
      pipeline: "fuerte",
      product: "estable",
    },
    knowledge: {
      customerFeedback:
        "Los clientes que permanecen están satisfechos, pero existe abandono temprano.",
    },
    expectedConstraint: "retention",
  },
  {
    id: "retention-02",
    name: "Strong pipeline, weak retention",
    message:
      "Tenemos muchas oportunidades comerciales, pero estamos perdiendo clientes demasiado rápido. ¿Qué debería dominar nuestra estrategia?",
    memory: {
      revenue: "$55k MRR",
      growth: "10% MoM",
      churn: "15%",
      pipeline: "muy fuerte",
      runway: "12 meses",
    },
    knowledge: {
      retentionProblem:
        "El mayor problema aparece después de la adquisición: los nuevos clientes no permanecen.",
    },
    expectedConstraint: "retention",
  },

  {
    id: "demand-01",
    name: "Empty pipeline",
    message:
      "Tenemos que elegir entre mejorar el producto, conseguir clientes o levantar capital. ¿Qué priorizarías?",
    memory: {
      revenue: "$5k MRR",
      growth: "2% MoM",
      churn: "3%",
      runway: "18 meses",
      pipeline: "casi vacío",
      product: "estable",
    },
    knowledge: {
      customerFeedback:
        "Los usuarios existentes valoran el producto y continúan utilizándolo.",
    },
    expectedConstraint: "demand",
  },
  {
    id: "demand-02",
    name: "Low acquisition",
    message:
      "Estamos creciendo lentamente y tenemos recursos limitados. ¿Dónde concentrarías el próximo mes?",
    memory: {
      revenue: "$18k MRR",
      growth: "2% MoM",
      churn: "2%",
      pipeline: "vacío",
      runway: "20 meses",
      product: "estable",
    },
    knowledge: {
      customerFeedback:
        "Los clientes actuales recomiendan el producto, pero llegan muy pocos prospectos nuevos.",
    },
    expectedConstraint: "demand",
  },

  {
    id: "capital-01",
    name: "Short runway",
    message:
      "El crecimiento no está mal, pero el efectivo se está agotando. ¿Qué debería dominar nuestra estrategia?",
    memory: {
      revenue: "$15k MRR",
      burn: "$45k/mes",
      runway: "3 meses",
      churn: "4%",
      pipeline: "fuerte",
    },
    knowledge: {
      cashSituation:
        "La empresa necesita preservar caja para seguir operando.",
    },
    expectedConstraint: "capital",
  },
  {
    id: "capital-02",
    name: "Cash preservation",
    message:
      "Si mantenemos el gasto actual, nos quedaremos sin efectivo muy pronto. ¿Qué debería dominar nuestra estrategia?",
    memory: {
      revenue: "$12k MRR",
      burn: "$35k/mes",
      runway: "3 meses",
      churn: "3%",
      pipeline: "fuerte",
    },
    knowledge: {
      cashSituation:
        "La empresa necesita preservar caja para seguir operando.",
    },
    expectedConstraint: "capital",
  },

  {
    id: "execution-01",
    name: "Team overload",
    message:
      "El equipo está sobrecargado y tenemos demasiadas iniciativas abiertas. ¿Qué atacarías primero?",
    memory: {
      revenue: "$25k MRR",
      growth: "4% MoM",
      churn: "4%",
      runway: "14 meses",
      teamCapacity: "muy limitada",
    },
    knowledge: {
      executionProblem:
        "El equipo no puede completar los objetivos críticos porque mantiene demasiadas prioridades simultáneas.",
    },
    expectedConstraint: "execution",
  },
  {
    id: "execution-02",
    name: "Changing priorities",
    message:
      "El equipo está sobrecargado y las prioridades cambian constantemente. ¿Qué atacarías primero?",
    memory: {
      revenue: "$25k MRR",
      growth: "4% MoM",
      churn: "4%",
      runway: "14 meses",
      teamCapacity: "muy limitada",
    },
    knowledge: {
      executionProblem:
        "Las interrupciones y cambios de prioridad impiden completar los objetivos críticos.",
    },
    expectedConstraint: "execution",
  },
];

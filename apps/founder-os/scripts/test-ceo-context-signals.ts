import {
  detectStrategicSignal,
} from "../lib/agents/ceo";

type Constraint =
  | "unknown"
  | "demand"
  | "retention"
  | "product"
  | "capital"
  | "execution";

type TestCase = {
  name: string;
  message: string;
  memory?: unknown;
  knowledge?: unknown;
  expectedConstraint: Constraint;
};

const cases: TestCase[] = [
  {
    name: "memory provides retention evidence",
    message:
      "¿Cuál debería ser nuestra prioridad estratégica?",
    memory: {
      churn: "18%",
      note: "Estamos perdiendo clientes rápidamente.",
    },
    expectedConstraint: "retention",
  },

  {
    name: "knowledge provides capital evidence",
    message:
      "Necesitamos decidir la prioridad principal.",
    knowledge: {
      runway: "2 meses",
      financialStatus:
        "La empresa necesita preservar liquidez.",
    },
    expectedConstraint: "capital",
  },

  {
    name: "memory provides product quality evidence",
    message:
      "¿Cuál es el cuello de botella principal?",
    memory: {
      currentProblem:
        "Las respuestas son demasiado genéricas y superficiales.",
      currentFocus:
        "Mejorar la calidad del producto.",
    },
    expectedConstraint: "product",
  },

  {
    name: "knowledge provides empty pipeline evidence",
    message:
      "Necesitamos definir la prioridad del CEO.",
    knowledge: {
      sales:
        "El pipeline está vacío y faltan oportunidades comerciales.",
    },
    expectedConstraint: "demand",
  },

  {
    name: "message critical capital beats weaker memory product concern",
    message:
      "Solo tenemos 2 meses de runway y necesitamos preservar caja.",
    memory: {
      product:
        "El producto es inconsistente y necesita mejoras de calidad.",
    },
    expectedConstraint: "capital",
  },

  {
    name: "message severe retention beats weaker knowledge demand concern",
    message:
      "Estamos perdiendo clientes rápidamente y el churn es de 18%.",
    knowledge: {
      sales:
        "Queremos mejorar la adquisición y generar más demanda.",
    },
    expectedConstraint: "retention",
  },

  {
    name: "message product concern beats generic memory demand language",
    message:
      "El producto es inconsistente y las respuestas son demasiado superficiales.",
    memory: {
      goal:
        "Queremos conseguir más clientes.",
    },
    expectedConstraint: "product",
  },

  {
    name: "capital evidence from knowledge beats product evidence from memory",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    memory: {
      product:
        "Las respuestas son superficiales y el producto es inconsistente.",
    },
    knowledge: {
      runway: "2 meses",
    },
    expectedConstraint: "capital",
  },

  {
    name: "retention evidence from memory beats generic demand knowledge",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    memory: {
      churn: "18%",
      status: "Estamos perdiendo clientes rápidamente.",
    },
    knowledge: {
      sales:
        "Necesitamos mejorar la adquisición de clientes.",
    },
    expectedConstraint: "retention",
  },

  {
    name: "generic team mention does not create execution signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    memory: {
      team:
        "Tenemos un equipo pequeño trabajando en el producto.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic capacity mention does not create execution signal",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    knowledge: {
      company:
        "La empresa tiene capacidad limitada como startup temprana.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "explicit overloaded team creates execution signal",
    message:
      "Necesitamos decidir la prioridad principal.",
    memory: {
      operations:
        "El equipo está sobrecargado, tiene demasiadas iniciativas abiertas y los proyectos críticos no se terminan.",
    },
    expectedConstraint: "execution",
  },

  {
    name: "explicit execution evidence does not override stronger capital evidence",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    memory: {
      operations:
        "El equipo está sobrecargado y las prioridades cambian constantemente.",
    },
    knowledge: {
      runway: "2 meses",
    },
    expectedConstraint: "capital",
  },

  {
    name: "positive product quality goal does not create product signal",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    memory: {
      goal:
        "Queremos mejorar continuamente la calidad del producto.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic user experience mention does not create product signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      product:
        "La experiencia de usuario es importante para nuestra estrategia.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "strategic recommendations mention alone does not create product signal",
    message:
      "Necesitamos identificar la prioridad principal.",
    memory: {
      capability:
        "El sistema genera recomendaciones estratégicas profundas.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "explicit inconsistent product quality creates product signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    memory: {
      product:
        "El producto es inconsistente y las respuestas son superficiales.",
    },
    expectedConstraint: "product",
  },

  {
    name: "positive demand goal does not create demand signal",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    memory: {
      goal:
        "Queremos generar más demanda y adquirir nuevos clientes.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic customer acquisition strategy does not create demand signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      strategy:
        "La adquisición de clientes es importante para nuestro crecimiento.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "healthy pipeline mention does not create demand signal",
    message:
      "Necesitamos identificar la prioridad principal.",
    memory: {
      sales:
        "Tenemos un pipeline saludable y varias oportunidades activas.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "explicit empty pipeline creates demand signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    memory: {
      sales:
        "El pipeline está casi vacío y faltan nuevos clientes.",
    },
    expectedConstraint: "demand",
  },

  {
    name: "positive retention goal does not create retention signal",
    message:
      "Necesitamos identificar la prioridad principal.",
    memory: {
      goal:
        "Queremos mejorar continuamente la retención de nuestros clientes.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic churn strategy does not create retention signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      strategy:
        "La estrategia incluye mejorar la retención y reducir el churn.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic customer satisfaction mention does not create retention signal",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    memory: {
      customers:
        "La satisfacción y retención de clientes son importantes.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "explicit customer abandonment creates retention signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    memory: {
      customers:
        "Los clientes están abandonando el producto demasiado rápido.",
    },
    expectedConstraint: "retention",
  },

  {
    name: "explicit high churn creates retention signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      metrics:
        "El churn actual es 18%.",
    },
    expectedConstraint: "retention",
  },

  {
    name: "positive team capacity goal does not create execution signal",
    message:
      "Necesitamos identificar la prioridad principal.",
    memory: {
      goal:
        "Queremos aumentar la capacidad del equipo durante este trimestre.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic execution strategy does not create execution signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      strategy:
        "La ejecución disciplinada es importante para alcanzar nuestros objetivos.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic multiple projects mention does not create execution signal",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    memory: {
      roadmap:
        "Tenemos varios proyectos planificados para los próximos meses.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "explicit overloaded team creates execution signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    memory: {
      team:
        "El equipo está sobrecargado y no tiene capacidad para completar las prioridades.",
    },
    expectedConstraint: "execution",
  },

  {
    name: "explicit unfinished critical projects creates execution signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      execution:
        "Los proyectos críticos no se terminan y las prioridades cambian constantemente.",
    },
    expectedConstraint: "execution",
  },

  {
    name: "positive fundraising goal does not create capital signal",
    message:
      "Necesitamos identificar la prioridad principal.",
    memory: {
      goal:
        "Queremos levantar capital para acelerar nuestro crecimiento.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic runway strategy does not create capital signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      strategy:
        "La estrategia financiera busca extender el runway de la empresa.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "generic burn rate mention does not create capital signal",
    message:
      "Necesitamos identificar el cuello de botella dominante.",
    memory: {
      finance:
        "Monitoreamos regularmente el burn rate y la posición de caja.",
    },
    expectedConstraint: "unknown",
  },

  {
    name: "explicit short runway creates capital signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    memory: {
      finance:
        "Solo tenemos 4 meses de runway disponibles.",
    },
    expectedConstraint: "capital",
  },

  {
    name: "critical runway creates maximum capital signal",
    message:
      "Necesitamos decidir la prioridad estratégica.",
    knowledge: {
      finance:
        "La empresa tiene menos de 3 meses de runway y debe preservar caja.",
    },
    expectedConstraint: "capital",
  },

  {
    name: "no evidence across message memory or knowledge returns unknown",
    message:
      "Queremos saber cuál debería ser la prioridad.",
    memory: {
      company: "Startup tecnológica.",
    },
    knowledge: {
      industry: "Software.",
    },
    expectedConstraint: "unknown",
  },
];

async function run() {
  let failures = 0;

  console.log("\n🧠 CEO CONTEXT SIGNAL TESTS\n");

  for (const test of cases) {
    try {
      const signal = detectStrategicSignal(
        test.message,
        test.memory,
        test.knowledge,
      );

      if (
        signal.constraint !==
        test.expectedConstraint
      ) {
        throw new Error(
          `Constraint: expected "${test.expectedConstraint}", received "${signal.constraint}"`,
        );
      }

      console.log(`✅ ${test.name}`);
      console.log(
        `   constraint: ${signal.constraint}`,
      );
      console.log(
        `   confidence: ${signal.confidence}`,
      );
      console.log(
        `   evidence: ${signal.evidence.length}`,
      );
    } catch (error) {
      failures += 1;

      console.error(`❌ ${test.name}`);

      if (error instanceof Error) {
        console.error(`   ${error.message}`);
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
        ? "✅ ALL CEO CONTEXT SIGNAL TESTS PASSED"
        : `❌ ${failures} CEO CONTEXT SIGNAL TEST(S) FAILED`
    }\n`,
  );

  process.exit(
    failures === 0 ? 0 : 1,
  );
}

run();

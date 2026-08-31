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

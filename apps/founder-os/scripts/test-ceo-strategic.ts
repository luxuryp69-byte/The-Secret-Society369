import {
  detectStrategicSignal,
  strategicFallback,
} from "../lib/agents/ceo";

type StrategicConstraint =
  | "unknown"
  | "demand"
  | "retention"
  | "product"
  | "capital"
  | "execution";

type TestCase = {
  name: string;
  message: string;
  expectedConstraint: StrategicConstraint;
  expectedPriorityFragment: string;
  expectedConfidence?: number | { min: number; max: number };
  memory?: unknown;
  knowledge?: unknown;
};

const cases: TestCase[] = [
  {
    name: "unknown strategic priority",
    message:
      "La empresa está funcionando normalmente y queremos saber qué debería priorizar el CEO durante los próximos 30 días.",
    expectedConstraint: "unknown",
    expectedPriorityFragment: "unknown",
  },
  {
    name: "demand strategic priority",
    message:
      "Tenemos un pipeline casi vacío, el churn está en 3% y el producto es estable. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "demand",
    expectedPriorityFragment: "demand",
  },
  {
    name: "retention strategic priority",
    message:
      "Estamos perdiendo muchos clientes, el churn ha aumentado significativamente y el pipeline comercial es saludable. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "retention",
    expectedPriorityFragment: "retention",
  },
  {
    name: "product strategic priority",
    message:
      "Tenemos demanda y buena retención, pero los usuarios consideran que el producto todavía es demasiado genérico y no resuelve bien sus necesidades. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "product",
    expectedPriorityFragment: "product",
  },
  {
    name: "capital strategic priority",
    message:
      "Tenemos menos de tres meses de runway, el burn es alto y necesitamos preservar caja. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "capital",
    expectedPriorityFragment: "capital",
  },
  {
    name: "execution strategic priority",
    message:
      "El equipo tiene demasiadas iniciativas abiertas, las prioridades cambian constantemente y los proyectos críticos no se terminan. ¿Qué debería priorizar el CEO durante los próximos 30 días?",
    expectedConstraint: "execution",
    expectedPriorityFragment: "execution",
  },

  {
    name: "product beats positive retention language",
    message:
      "Tenemos buena retención y demanda estable, pero el producto sigue siendo demasiado genérico y no resuelve las necesidades principales de los usuarios.",
    expectedConstraint: "product",
    expectedPriorityFragment: "product",
  },

  {
    name: "retention beats healthy pipeline",
    message:
      "El pipeline comercial es saludable, pero estamos perdiendo muchos clientes y el churn continúa aumentando.",
    expectedConstraint: "retention",
    expectedPriorityFragment: "retention",
  },

  {
    name: "demand beats stable product",
    message:
      "El producto es estable y los clientes actuales están satisfechos, pero tenemos el pipeline casi vacío y necesitamos generar nuevas oportunidades.",
    expectedConstraint: "demand",
    expectedPriorityFragment: "demand",
  },

  {
    name: "capital beats other strategic concerns",
    message:
      "Tenemos menos de tres meses de runway, aunque el producto tiene oportunidades de mejora y queremos crecer.",
    expectedConstraint: "capital",
    expectedPriorityFragment: "capital",
  },

  {
    name: "execution from too many simultaneous initiatives",
    message:
      "El equipo tiene demasiadas iniciativas abiertas, cambia constantemente de prioridad y los proyectos importantes nunca se terminan.",
    expectedConstraint: "execution",
    expectedPriorityFragment: "execution",
  },
  {
    name: "unknown has zero confidence",
    message:
      "La empresa está funcionando normalmente y queremos saber qué debería priorizar el CEO.",
    expectedConstraint: "unknown",
    expectedPriorityFragment: "unknown",
    expectedConfidence: 0,
  },

  {
    name: "severe churn produces high retention confidence",
    message:
      "Estamos perdiendo clientes rápidamente y el churn es de 18%.",
    expectedConstraint: "retention",
    expectedPriorityFragment: "retention",
    expectedConfidence: { min: 95, max: 95 },
  },

  {
    name: "empty pipeline produces high demand confidence",
    message:
      "Nuestro pipeline está completamente vacío y necesitamos nuevas oportunidades.",
    expectedConstraint: "demand",
    expectedPriorityFragment: "demand",
    expectedConfidence: { min: 90, max: 90 },
  },

  {
    name: "critical runway produces maximum capital confidence",
    message:
      "Solo tenemos 2 meses de runway y necesitamos preservar caja.",
    expectedConstraint: "capital",
    expectedPriorityFragment: "capital",
    expectedConfidence: { min: 100, max: 100 },
  },

  {
    name: "critical capital beats strong product concerns",
    message:
      "Solo tenemos 2 meses de runway. Además, el producto es inconsistente y los usuarios reportan problemas importantes de calidad.",
    expectedConstraint: "capital",
    expectedPriorityFragment: "capital",
    expectedConfidence: 100,
  },

  {
    name: "severe retention beats moderate demand",
    message:
      "Estamos perdiendo clientes rápidamente y el churn es de 18%. El pipeline necesita más oportunidades, pero todavía tenemos algunas oportunidades comerciales.",
    expectedConstraint: "retention",
    expectedPriorityFragment: "retention",
    expectedConfidence: 95,
  },

  {
    name: "strong product issue beats weaker demand language",
    message:
      "Necesitamos mejorar la adquisición, pero el problema principal es que el producto es inconsistente, las respuestas son demasiado superficiales y los usuarios no reciben suficiente valor.",
    expectedConstraint: "product",
    expectedPriorityFragment: "product",
    expectedConfidence: { min: 85, max: 90 },
  },

  {
    name: "critical capital beats execution overload",
    message:
      "Tenemos solo 2 meses de runway. El equipo también tiene demasiadas iniciativas abiertas y problemas de capacidad.",
    expectedConstraint: "capital",
    expectedPriorityFragment: "capital",
    expectedConfidence: 100,
  },

  {
    name: "empty pipeline beats generic execution concerns",
    message:
      "Nuestro pipeline está completamente vacío y necesitamos generar oportunidades. El equipo también tiene varias iniciativas abiertas.",
    expectedConstraint: "demand",
    expectedPriorityFragment: "demand",
    expectedConfidence: 90,
  },

  {
    name: "severe churn beats product concerns",
    message:
      "El churn es de 18% y estamos perdiendo clientes rápidamente. El producto también necesita algunas mejoras de calidad.",
    expectedConstraint: "retention",
    expectedPriorityFragment: "retention",
    expectedConfidence: 95,
  },

  {
    name: "critical capital beats severe retention",
    message:
      "Tenemos 2 meses de runway y el churn es de 18%. Necesitamos decidir cuál es el cuello de botella dominante.",
    expectedConstraint: "capital",
    expectedPriorityFragment: "capital",
    expectedConfidence: 100,
  },

  {
    name: "product beats healthy demand when reliability is inconsistent",
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
    expectedPriorityFragment: "product",
  },
];

async function run() {
  let failures = 0;

  console.log("\n👔 CEO STRATEGIC REGRESSION TESTS\n");

  for (const test of cases) {
    try {
      // --------------------------------------------------
      // 1. Constraint detection invariant
      // --------------------------------------------------

      const signal = detectStrategicSignal(
        test.message,
        test.memory ?? {},
        test.knowledge ?? {},
      );

      if (signal.constraint !== test.expectedConstraint) {
        throw new Error(
          `Constraint: expected "${test.expectedConstraint}", received "${signal.constraint}"`,
        );
      }

      // --------------------------------------------------
      // 2. Confidence invariant
      // --------------------------------------------------

      if (test.expectedConfidence !== undefined) {
        if (typeof test.expectedConfidence === "number") {
          if (signal.confidence !== test.expectedConfidence) {
            throw new Error(
              `Confidence: expected "${test.expectedConfidence}", received "${signal.confidence}"`,
            );
          }
        } else {
          const { min, max } = test.expectedConfidence;

          if (signal.confidence < min || signal.confidence > max) {
            throw new Error(
              `Confidence: expected between "${min}" and "${max}", received "${signal.confidence}"`,
            );
          }
        }
      }

      // --------------------------------------------------
      // 3. Canonical fallback invariant
      // --------------------------------------------------

      const result = strategicFallback(signal);

      if (!result.primaryPriority) {
        throw new Error(
          "Fallback: primaryPriority is missing",
        );
      }

      if (
        !result.primaryPriority
          .toLowerCase()
          .includes(test.expectedPriorityFragment)
      ) {
        throw new Error(
          `Fallback: expected priority containing "${test.expectedPriorityFragment}", received "${result.primaryPriority}"`,
        );
      }

      if (!result.why) {
        throw new Error("Fallback: why is missing");
      }

      if (!Array.isArray(result.plan) || result.plan.length < 3) {
        throw new Error(
          `Fallback: expected at least 3 plan items, received ${result.plan?.length ?? 0}`,
        );
      }

      if (
        !Array.isArray(result.successCriteria) ||
        result.successCriteria.length < 2
      ) {
        throw new Error(
          `Fallback: expected at least 2 success criteria, received ${result.successCriteria?.length ?? 0}`,
        );
      }

      if (!result.whatNotToPrioritize) {
        throw new Error(
          "Fallback: whatNotToPrioritize is missing",
        );
      }

      console.log(`✅ ${test.name}`);
      console.log(`   constraint: ${signal.constraint}`);
      console.log(`   priority: ${result.primaryPriority}`);
    } catch (error) {
      failures += 1;

      console.error(`❌ ${test.name}`);

      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      } else {
        console.error(`   ${String(error)}`);
      }
    }
  }

  console.log(
    `\n${failures === 0
      ? "✅ ALL CEO STRATEGIC TESTS PASSED"
      : `❌ ${failures} CEO STRATEGIC TEST(S) FAILED`
    }\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

run();

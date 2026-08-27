import {
  detectStrategicSignal,
  strategicFallback,
} from "../lib/agents/ceo";

type TestCase = {
  name: string;
  message: string;
  expectedConstraint:
    | "unknown"
    | "demand"
    | "retention"
    | "product"
    | "capital"
    | "execution";
  expectedPriorityFragment: string;
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
      // 2. Canonical fallback invariant
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

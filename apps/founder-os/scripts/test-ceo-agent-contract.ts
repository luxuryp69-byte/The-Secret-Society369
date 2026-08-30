import { ceoAgent } from "../lib/agents/ceo";

type ExpectedConstraint =
  | "unknown"
  | "demand"
  | "retention"
  | "product"
  | "capital"
  | "execution";

type CEOOutput = {
  primaryPriority: string;
  why: string;
  plan: string[];
  successCriteria: string[];
  whatNotToPrioritize: string;
};

type TestCase = {
  name: string;
  message: string;
  expectedPriorityFragment: string;
};

const cases: TestCase[] = [
  {
    name: "unknown contract",
    message:
      "La empresa está funcionando normalmente y queremos saber qué debería priorizar el CEO.",
    expectedPriorityFragment: "unknown",
  },
  {
    name: "product contract",
    message:
      "El producto es inconsistente, las respuestas son superficiales y los usuarios no reciben suficiente valor.",
    expectedPriorityFragment: "product",
  },
  {
    name: "retention contract",
    message:
      "Estamos perdiendo clientes rápidamente y el churn es de 18%.",
    expectedPriorityFragment: "retention",
  },
  {
    name: "demand contract",
    message:
      "Nuestro pipeline está completamente vacío y necesitamos nuevas oportunidades.",
    expectedPriorityFragment: "demand",
  },
  {
    name: "capital contract",
    message:
      "Solo tenemos 2 meses de runway y necesitamos preservar caja.",
    expectedPriorityFragment: "capital",
  },
  {
    name: "execution contract",
    message:
      "Tenemos demasiadas iniciativas abiertas, el equipo está saturado y no logramos terminar prioridades.",
    expectedPriorityFragment: "execution",
  },
];

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${field}: expected non-empty string`,
    );
  }
}

function assertArrayOfStrings(
  value: unknown,
  field: string,
  expectedLength: number,
): asserts value is string[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `${field}: expected array`,
    );
  }

  if (value.length !== expectedLength) {
    throw new Error(
      `${field}: expected ${expectedLength} items, received ${value.length}`,
    );
  }

  for (const [index, item] of value.entries()) {
    assertNonEmptyString(
      item,
      `${field}[${index}]`,
    );
  }
}

function parseCEOOutput(
  raw: string,
): CEOOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `ceoAgent returned invalid JSON: ${raw}`,
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "ceoAgent output must be a JSON object",
    );
  }

  const output = parsed as Record<string, unknown>;

  assertNonEmptyString(
    output.primaryPriority,
    "primaryPriority",
  );

  assertNonEmptyString(
    output.why,
    "why",
  );

  assertArrayOfStrings(
    output.plan,
    "plan",
    3,
  );

  assertArrayOfStrings(
    output.successCriteria,
    "successCriteria",
    2,
  );

  assertNonEmptyString(
    output.whatNotToPrioritize,
    "whatNotToPrioritize",
  );

  return {
    primaryPriority: output.primaryPriority,
    why: output.why,
    plan: output.plan,
    successCriteria:
      output.successCriteria,
    whatNotToPrioritize:
      output.whatNotToPrioritize,
  };
}

async function run() {
  let failures = 0;

  console.log(
    "\n👔 CEO AGENT CONTRACT TESTS\n",
  );

  for (const test of cases) {
    try {
      const raw = await ceoAgent(
        test.message,
      );

      const output =
        parseCEOOutput(raw);

      if (
        !output.primaryPriority
          .toLowerCase()
          .includes(
            test.expectedPriorityFragment,
          )
      ) {
        throw new Error(
          `Priority: expected fragment "${test.expectedPriorityFragment}", received "${output.primaryPriority}"`,
        );
      }

      console.log(`✅ ${test.name}`);
      console.log(
        `   priority: ${output.primaryPriority}`,
      );
      console.log(
        `   plan: ${output.plan.length} actions`,
      );
      console.log(
        `   success criteria: ${output.successCriteria.length}`,
      );
    } catch (error) {
      failures += 1;

      console.error(
        `❌ ${test.name}`,
      );

      if (error instanceof Error) {
        console.error(
          `   ${error.message}`,
        );
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
        ? "✅ ALL CEO AGENT CONTRACT TESTS PASSED"
        : `❌ ${failures} CEO AGENT CONTRACT TEST(S) FAILED`
    }\n`,
  );

  process.exit(
    failures === 0 ? 0 : 1,
  );
}

run();

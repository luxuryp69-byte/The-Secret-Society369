import {
  selectHigherPrioritySignal,
} from "../lib/agents/ceo";

type Constraint =
  | "unknown"
  | "demand"
  | "retention"
  | "product"
  | "capital"
  | "execution";

type Signal = {
  constraint: Constraint;
  evidence: string[];
  confidence: number;
};

function signal(
  constraint: Constraint,
  confidence: number,
): Signal {
  return {
    constraint,
    confidence,
    evidence: [`Test signal for ${constraint}`],
  };
}

type TestCase = {
  name: string;
  signals: Signal[];
  expectedConstraint: Constraint;
  expectedConfidence: number;
};

const cases: TestCase[] = [
  {
    name: "empty signals returns unknown",
    signals: [],
    expectedConstraint: "unknown",
    expectedConfidence: 0,
  },

  {
    name: "equal confidence: capital beats product",
    signals: [
      signal("product", 85),
      signal("capital", 85),
    ],
    expectedConstraint: "capital",
    expectedConfidence: 85,
  },

  {
    name: "equal confidence: product beats retention",
    signals: [
      signal("retention", 85),
      signal("product", 85),
    ],
    expectedConstraint: "product",
    expectedConfidence: 85,
  },

  {
    name: "equal confidence: retention beats demand",
    signals: [
      signal("demand", 85),
      signal("retention", 85),
    ],
    expectedConstraint: "retention",
    expectedConfidence: 85,
  },

  {
    name: "equal confidence: demand beats execution",
    signals: [
      signal("execution", 85),
      signal("demand", 85),
    ],
    expectedConstraint: "demand",
    expectedConfidence: 85,
  },

  {
    name: "equal confidence: execution beats unknown",
    signals: [
      signal("unknown", 85),
      signal("execution", 85),
    ],
    expectedConstraint: "execution",
    expectedConfidence: 85,
  },

  {
    name: "higher confidence beats higher strategic priority",
    signals: [
      signal("capital", 80),
      signal("execution", 81),
    ],
    expectedConstraint: "execution",
    expectedConfidence: 81,
  },

  {
    name: "confidence difference dominates priority difference",
    signals: [
      signal("capital", 84),
      signal("product", 85),
    ],
    expectedConstraint: "product",
    expectedConfidence: 85,
  },

  {
    name: "exact tie keeps first signal deterministically",
    signals: [
      signal("product", 85),
      signal("product", 85),
    ],
    expectedConstraint: "product",
    expectedConfidence: 85,
  },

  {
    name: "confidence is clamped above 100 for scoring",
    signals: [
      signal("product", 100),
      signal("capital", 101),
    ],
    expectedConstraint: "capital",
    expectedConfidence: 101,
  },

  {
    name: "negative confidence is clamped to zero for scoring",
    signals: [
      signal("unknown", -10),
      signal("execution", -20),
    ],
    expectedConstraint: "execution",
    expectedConfidence: -20,
  },
];

async function run() {
  let failures = 0;

  console.log("\n🎯 CEO SIGNAL SELECTION TESTS\n");

  for (const test of cases) {
    try {
      const result = selectHigherPrioritySignal(test.signals);

      if (result.constraint !== test.expectedConstraint) {
        throw new Error(
          `Constraint: expected "${test.expectedConstraint}", received "${result.constraint}"`,
        );
      }

      if (result.confidence !== test.expectedConfidence) {
        throw new Error(
          `Confidence: expected "${test.expectedConfidence}", received "${result.confidence}"`,
        );
      }

      console.log(`✅ ${test.name}`);
      console.log(
        `   winner: ${result.constraint} (${result.confidence})`,
      );
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
    `\n${
      failures === 0
        ? "✅ ALL CEO SIGNAL SELECTION TESTS PASSED"
        : `❌ ${failures} CEO SIGNAL SELECTION TEST(S) FAILED`
    }\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

run();

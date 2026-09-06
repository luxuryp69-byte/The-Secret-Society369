const BASE_URL = process.env.FOUNDER_OS_URL ?? "http://localhost:3000";

type TestCase = {
  name: string;
  body: unknown;
  expectedStatus: number;
  expectedSuccess: boolean;
};

const oversizedMessage = "x".repeat(10_001);

const tests: TestCase[] = [
  {
    name: "accepts a valid message",
    body: {
      message: "Mi empresa necesita conseguir clientes.",
    },
    expectedStatus: 200,
    expectedSuccess: true,
  },
  {
    name: "rejects missing message",
    body: {},
    expectedStatus: 400,
    expectedSuccess: false,
  },
  {
    name: "rejects empty message",
    body: {
      message: "   ",
    },
    expectedStatus: 400,
    expectedSuccess: false,
  },
  {
    name: "rejects non-string message",
    body: {
      message: 123,
    },
    expectedStatus: 400,
    expectedSuccess: false,
  },
  {
    name: "rejects oversized message",
    body: {
      message: oversizedMessage,
    },
    expectedStatus: 400,
    expectedSuccess: false,
  },
];

async function runTest(test: TestCase): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(test.body),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    response?: string;
  };

  if (response.status !== test.expectedStatus) {
    throw new Error(
      `${test.name}: expected HTTP ${test.expectedStatus}, got ${response.status}`,
    );
  }

  if (payload.success !== test.expectedSuccess) {
    throw new Error(
      `${test.name}: expected success=${test.expectedSuccess}, got success=${payload.success}`,
    );
  }

  if (
    test.expectedStatus === 400 &&
    typeof payload.response !== "string"
  ) {
    throw new Error(`${test.name}: expected a validation response`);
  }

  console.log(`✅ ${test.name}`);
}

async function main(): Promise<void> {
  console.log(`Testing Founder OS API at ${BASE_URL}`);

  for (const test of tests) {
    await runTest(test);
  }

  console.log(`\n🎉 ${tests.length}/${tests.length} API tests passed.`);
}

main().catch((error) => {
  console.error("\n❌ Chat API tests failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

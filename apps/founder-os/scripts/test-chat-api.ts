import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

const BASE_URL = "http://127.0.0.1:3000";

interface TestCase {
  name: string;
  body: unknown;
  expectedStatus: number;
}

const tests: TestCase[] = [
  {
    name: "valid message",
    body: {
      message: "Mi empresa tiene un pipeline casi vacío y necesito conseguir clientes.",
    },
    expectedStatus: 200,
  },
  {
    name: "missing message",
    body: {},
    expectedStatus: 400,
  },
  {
    name: "empty message",
    body: {
      message: "   ",
    },
    expectedStatus: 400,
  },
  {
    name: "non-string message",
    body: {
      message: 123,
    },
    expectedStatus: 400,
  },
  {
    name: "oversized message",
    body: {
      message: "x".repeat(10_001),
    },
    expectedStatus: 400,
  },
];

function startServer(): ChildProcessByStdio<null, Readable, Readable> {
  console.log("Starting temporary Next.js production server...");

  const server = spawn(
    "pnpm",
    [
      "exec",
      "next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3000",
    ],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
      },
    },
  );

  server.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(`[next] ${chunk.toString()}`);
  });

  server.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(`[next] ${chunk.toString()}`);
  });

  return server;
}

function waitForServerReady(
  server: ChildProcessByStdio<null, Readable, Readable>,
  timeoutMs = 30_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;

      settled = true;
      reject(
        new Error(
          `Founder OS server did not report readiness within ${timeoutMs}ms.`,
        ),
      );
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      server.stdout.off("data", onStdout);
      server.stderr.off("data", onStderr);
      server.off("exit", onExit);
      server.off("error", onError);
    };

    const succeed = () => {
      if (settled) return;

      settled = true;
      cleanup();
      resolve();
    };

    const fail = (error: Error) => {
      if (settled) return;

      settled = true;
      cleanup();
      reject(error);
    };

    const onStdout = (chunk: Buffer) => {
      const output = chunk.toString();

      if (
        output.includes("Ready in") ||
        output.includes("Ready")
      ) {
        succeed();
      }
    };

    const onStderr = () => {
      // Next may emit non-fatal startup information on stderr.
    };

    const onExit = (code: number | null, signal: string | null) => {
      fail(
        new Error(
          `Next.js server exited before readiness (code=${code}, signal=${signal}).`,
        ),
      );
    };

    const onError = (error: Error) => {
      fail(error);
    };

    server.stdout.on("data", onStdout);
    server.stderr.on("data", onStderr);
    server.on("exit", onExit);
    server.on("error", onError);
  });
}

async function runTest(test: TestCase): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(test.body),
  });

  const text = await response.text();

  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (response.status !== test.expectedStatus) {
    throw new Error(
      [
        `Test failed: ${test.name}`,
        `Expected HTTP ${test.expectedStatus}`,
        `Received HTTP ${response.status}`,
        `Response: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
      ].join("\n"),
    );
  }

  if (test.expectedStatus === 200) {
    if (
      !payload ||
      typeof payload !== "object" ||
      !("response" in payload) ||
      typeof payload.response !== "string" ||
      payload.response.trim().length === 0
    ) {
      throw new Error(
        `Test failed: ${test.name}\nExpected a non-empty response field.`,
      );
    }
  }

  if (test.expectedStatus === 400) {
    if (
      !payload ||
      typeof payload !== "object" ||
      !("error" in payload) ||
      typeof payload.error !== "string" ||
      payload.error.trim().length === 0
    ) {
      throw new Error(
        `Test failed: ${test.name}\nExpected a non-empty error field.`,
      );
    }
  }

  console.log(`✓ ${test.name}`);
}

async function main(): Promise<void> {
  console.log(`Testing Founder OS API at ${BASE_URL}`);

  const server = startServer();

  const shutdown = () => {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForServerReady(server);

    console.log("Next.js production server is ready.");
    console.log("");

    for (const test of tests) {
      await runTest(test);
    }

    console.log("");
    console.log("✓ All Chat API tests passed.");
  } finally {
    shutdown();
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
  }
}

main().catch((error) => {
  console.error("❌ Chat API tests failed.");

  console.error(
    error instanceof Error ? error.message : error,
  );

  process.exitCode = 1;
});

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DecisionTrace } from "./types";
import type { DecisionTraceRepository } from "./repository";

const DEFAULT_FILE_NAME = "decision-traces.json";

type TraceStore = Record<string, DecisionTrace>;

let writeQueue: Promise<void> = Promise.resolve();

function getStorePath(): string {
  return path.join(
    process.cwd(),
    "data",
    process.env.DECISION_TRACE_FILE?.trim() ||
      DEFAULT_FILE_NAME,
  );
}

async function readStore(): Promise<TraceStore> {
  const filePath = getStorePath();

  try {
    const raw = await readFile(filePath, "utf8");

    if (!raw.trim()) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "Decision trace store must contain an object.",
      );
    }

    return parsed as TraceStore;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {};
    }

    throw error;
  }
}

async function writeStore(store: TraceStore): Promise<void> {
  const filePath = getStorePath();
  const directory = path.dirname(filePath);

  await mkdir(directory, {
    recursive: true,
  });

  const temporaryPath =
    `${filePath}.${process.pid}.tmp`;

  await writeFile(
    temporaryPath,
    `${JSON.stringify(store, null, 2)}\n`,
    "utf8",
  );

  await rename(
    temporaryPath,
    filePath,
  );
}

async function enqueueWrite(
  operation: () => Promise<void>,
): Promise<void> {
  const next = writeQueue.then(operation);

  writeQueue = next.catch(() => undefined);

  await next;
}

export class LocalDecisionTraceRepository
  implements DecisionTraceRepository
{
  async save(
    trace: DecisionTrace,
  ): Promise<void> {
    await enqueueWrite(async () => {
      const store = await readStore();

      if (store[trace.traceId] !== undefined) {
        throw new Error(
          `Decision trace already exists: ${trace.traceId}`,
        );
      }

      store[trace.traceId] = trace;

      await writeStore(store);
    });
  }

  async get(
    traceId: string,
  ): Promise<DecisionTrace | null> {
    const normalizedTraceId = traceId.trim();

    if (!normalizedTraceId) {
      return null;
    }

    const store = await readStore();

    return store[normalizedTraceId] ?? null;
  }
}

export function createDecisionTraceRepository():
  DecisionTraceRepository {
  return new LocalDecisionTraceRepository();
}

export async function saveDecisionTrace(
  trace: DecisionTrace,
): Promise<void> {
  const repository =
    createDecisionTraceRepository();

  await repository.save(trace);
}

export async function getDecisionTrace(
  traceId: string,
): Promise<DecisionTrace | null> {
  const repository =
    createDecisionTraceRepository();

  return repository.get(traceId);
}

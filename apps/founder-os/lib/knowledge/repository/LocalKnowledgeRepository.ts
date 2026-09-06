import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { KnowledgeItem } from "../types";
import type { KnowledgeRepository } from "./KnowledgeRepository";

const DEFAULT_FILE = path.join(
  process.cwd(),
  "data",
  "knowledge.json",
);

async function readItems(filePath: string): Promise<KnowledgeItem[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Knowledge storage must contain an array.");
    }

    return parsed as KnowledgeItem[];
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? error.code
        : undefined;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeItems(
  filePath: string,
  items: KnowledgeItem[],
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });

  await writeFile(
    filePath,
    `${JSON.stringify(items, null, 2)}\n`,
    "utf8",
  );
}

export class LocalKnowledgeRepository
  implements KnowledgeRepository
{
  constructor(
    private readonly filePath = DEFAULT_FILE,
  ) {}

  async list(): Promise<KnowledgeItem[]> {
    return readItems(this.filePath);
  }

  async get(id: string): Promise<KnowledgeItem | null> {
    const items = await readItems(this.filePath);
    return items.find((item) => item.id === id) ?? null;
  }

  async save(item: KnowledgeItem): Promise<void> {
    const items = await readItems(this.filePath);
    const index = items.findIndex(
      (existing) => existing.id === item.id,
    );

    if (index === -1) {
      items.push(item);
    } else {
      items[index] = item;
    }

    await writeItems(this.filePath, items);
  }

  async delete(id: string): Promise<void> {
    const items = await readItems(this.filePath);
    const filtered = items.filter((item) => item.id !== id);

    if (filtered.length !== items.length) {
      await writeItems(this.filePath, filtered);
    }
  }
}

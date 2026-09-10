import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { KnowledgeItem } from "../types";
import type { KnowledgeRepository } from "./KnowledgeRepository";

const DEFAULT_FILE = path.join(
  process.cwd(),
  "data",
  "knowledge.json",
);

async function readItems(
  filePath: string,
): Promise<KnowledgeItem[]> {
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
  await mkdir(path.dirname(filePath), {
    recursive: true,
  });

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

  async get(
    id: string,
  ): Promise<KnowledgeItem | null> {
    const items = await readItems(this.filePath);

    return (
      items.find((item) => item.id === id) ??
      null
    );
  }

  async findByFingerprint(
    contentHash: string,
  ): Promise<KnowledgeItem | null> {
    const items = await readItems(this.filePath);

    return (
      items.find(
        (item) => item.contentHash === contentHash,
      ) ?? null
    );
  }

  async save(
    item: KnowledgeItem,
  ): Promise<void> {
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

  async upsert(
    item: KnowledgeItem,
  ): Promise<KnowledgeItem> {
    const items = await readItems(this.filePath);

    const existingIndex = items.findIndex(
      (existing) =>
        existing.contentHash !== undefined &&
        existing.contentHash === item.contentHash,
    );

    if (existingIndex === -1) {
      items.push(item);

      await writeItems(this.filePath, items);

      return item;
    }

    const existing = items[existingIndex];

    const merged: KnowledgeItem = {
      ...existing,
      ...item,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: item.updatedAt,
      ...(existing.provenance || item.provenance
        ? {
            provenance: {
              sourceUrl:
                item.provenance?.sourceUrl ??
                existing.provenance?.sourceUrl ??
                item.source.url,
              fetchedAt:
                item.provenance?.fetchedAt ??
                existing.provenance?.fetchedAt ??
                item.updatedAt,
              publishedAt:
                item.provenance?.publishedAt ??
                existing.provenance?.publishedAt ??
                item.publishedAt,
              verifiedAt:
                item.provenance?.verifiedAt ??
                existing.provenance?.verifiedAt ??
                item.verifiedAt,
            },
          }
        : {}),
    };

    items[existingIndex] = merged;

    await writeItems(this.filePath, items);

    return merged;
  }

  async delete(
    id: string,
  ): Promise<void> {
    const items = await readItems(this.filePath);

    const filtered = items.filter(
      (item) => item.id !== id,
    );

    if (filtered.length !== items.length) {
      await writeItems(
        this.filePath,
        filtered,
      );
    }
  }
}

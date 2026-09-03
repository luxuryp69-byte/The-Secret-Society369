import { promises as fs } from "node:fs";
import path from "node:path";

import { defaultMemory } from "../defaultMemory";
import type { FounderMemory } from "../types";
import type { MemoryRepository } from "./MemoryRepository";

const DEFAULT_MEMORY_FILE = path.join(
  process.cwd(),
  "data",
  "memory.json"
);

function cloneDefaultMemory(): FounderMemory {
  return structuredClone(defaultMemory);
}

export class LocalMemoryRepository
  implements MemoryRepository
{
  private readonly file: string;

  constructor(
    file = DEFAULT_MEMORY_FILE
  ) {
    this.file = file;
  }

  async load(
    _ownerId: string
  ): Promise<FounderMemory> {
    try {
      const raw =
        await fs.readFile(
          this.file,
          "utf8"
        );

      return JSON.parse(
        raw
      ) as FounderMemory;

    } catch (error) {

      const code =
        error &&
        typeof error === "object" &&
        "code" in error
          ? String(
              (
                error as {
                  code?: unknown;
                }
              ).code
            )
          : "";

      if (code === "ENOENT") {
        return cloneDefaultMemory();
      }

      throw error;
    }
  }

  async save(
    _ownerId: string,
    memory: FounderMemory
  ): Promise<void> {

    await fs.mkdir(
      path.dirname(this.file),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      this.file,
      JSON.stringify(
        memory,
        null,
        2
      ),
      "utf8"
    );
  }

  async exists(
    _ownerId: string
  ): Promise<boolean> {
    try {
      await fs.access(
        this.file
      );

      return true;

    } catch {
      return false;
    }
  }

  async delete(
    _ownerId: string
  ): Promise<void> {
    try {
      await fs.unlink(
        this.file
      );

    } catch (error) {

      const code =
        error &&
        typeof error === "object" &&
        "code" in error
          ? String(
              (
                error as {
                  code?: unknown;
                }
              ).code
            )
          : "";

      if (code !== "ENOENT") {
        throw error;
      }
    }
  }

  async export(
    ownerId: string
  ): Promise<FounderMemory> {
    return this.load(
      ownerId
    );
  }
}

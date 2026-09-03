import type {
  FounderMemory,
} from "./types";

import {
  createMemoryRepository,
} from "./repository/createMemoryRepository";

const DEFAULT_OWNER_ID =
  "default-founder";

function getOwnerId():
  string {

  return (
    process.env.MEMORY_OWNER_ID
      ?.trim() ||
    DEFAULT_OWNER_ID
  );
}

export async function loadMemory():
  Promise<FounderMemory> {

  const repository =
    createMemoryRepository();

  return repository.load(
    getOwnerId()
  );
}

export async function saveMemory(
  memory: FounderMemory
): Promise<void> {

  const repository =
    createMemoryRepository();

  try {

    await repository.save(
      getOwnerId(),
      memory
    );

  } catch (error) {

    /*
     * Local fallback is NEVER implicit in production.
     *
     * It must be explicitly enabled with:
     *
     * MEMORY_ALLOW_LOCAL_FALLBACK=true
     */
    const fallbackEnabled =
      process.env.MEMORY_ALLOW_LOCAL_FALLBACK ===
      "true";

    if (
      fallbackEnabled &&
      process.env.MEMORY_STORAGE ===
      "supabase"
    ) {

      console.warn(
        "⚠️ Supabase memory persistence failed. Using local fallback.",
        error
      );

      const {
        LocalMemoryRepository,
      } =
        await import(
          "./repository/LocalMemoryRepository"
        );

      const fallback =
        new LocalMemoryRepository();

      await fallback.save(
        getOwnerId(),
        memory
      );

      return;
    }

    throw error;
  }
}

export async function memoryExists():
  Promise<boolean> {

  const repository =
    createMemoryRepository();

  return repository.exists(
    getOwnerId()
  );
}

export async function deleteMemory():
  Promise<void> {

  const repository =
    createMemoryRepository();

  await repository.delete(
    getOwnerId()
  );
}

export async function exportMemory():
  Promise<FounderMemory> {

  const repository =
    createMemoryRepository();

  return repository.export(
    getOwnerId()
  );
}

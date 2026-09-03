import type {
  MemoryRepository,
} from "./MemoryRepository";

import {
  LocalMemoryRepository,
} from "./LocalMemoryRepository";

import {
  SupabaseMemoryRepository,
} from "./SupabaseMemoryRepository";

let repository:
  | MemoryRepository
  | undefined;

function getStorageMode():
  | "local"
  | "supabase" {

  const configured =
    process.env.MEMORY_STORAGE
      ?.trim()
      .toLowerCase();

  if (
    configured ===
    "local"
  ) {
    return "local";
  }

  if (
    configured ===
    "supabase"
  ) {
    return "supabase";
  }

  /*
   * Local development defaults to local storage.
   *
   * Vercel defaults to Supabase because its
   * filesystem is not persistent.
   */
  if (
    process.env.VERCEL ===
    "1"
  ) {
    return "supabase";
  }

  return "local";
}

export function createMemoryRepository():
  MemoryRepository {

  if (repository) {
    return repository;
  }

  const mode =
    getStorageMode();

  if (
    mode ===
    "supabase"
  ) {
    repository =
      new SupabaseMemoryRepository();

    return repository;
  }

  repository =
    new LocalMemoryRepository();

  return repository;
}

export function resetMemoryRepository():
  void {
  repository =
    undefined;
}

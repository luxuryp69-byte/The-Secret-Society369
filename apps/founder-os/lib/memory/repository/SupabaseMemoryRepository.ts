import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  defaultMemory,
} from "../defaultMemory";

import type {
  FounderMemory,
} from "../types";

import type {
  MemoryRepository,
} from "./MemoryRepository";

interface FounderMemoryRow {
  id: string;
  owner_id: string;
  memory: FounderMemory;
  created_at: string;
  updated_at: string;
}

function getSupabaseUrl(): string {
  const value =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error(
      "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not configured"
    );
  }

  /*
   * Supabase JS expects the project URL:
   *
   * https://project.supabase.co
   *
   * Older local configuration may contain:
   *
   * https://project.supabase.co/rest/v1/
   *
   * Normalize both forms.
   */
  return value
    .replace(
      /\/rest\/v1\/?$/,
      ""
    )
    .replace(
      /\/+$/,
      ""
    );
}

function getSupabaseKey(): string {
  /*
   * The publishable/anon key is intentionally used here.
   *
   * Memory access must be protected by Supabase RLS.
   * Never expose or require the service-role key in
   * the application runtime.
   */
  const value =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(
      "SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured"
    );
  }

  return value;
}

function cloneDefaultMemory(): FounderMemory {
  return structuredClone(
    defaultMemory
  );
}

export class SupabaseMemoryRepository
  implements MemoryRepository
{
  private readonly client:
    SupabaseClient;

  private readonly table =
    "founder_memory";

  constructor(
    client?: SupabaseClient
  ) {
    this.client =
      client ??
      createClient(
        getSupabaseUrl(),
        getSupabaseKey(),
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
  }

  async load(
    ownerId: string
  ): Promise<FounderMemory> {

    const {
      data,
      error,
    } =
      await this.client
        .from(this.table)
        .select(
          "memory"
        )
        .eq(
          "owner_id",
          ownerId
        )
        .maybeSingle();

    if (error) {
      throw new Error(
        `Supabase memory load failed: ${error.message}`
      );
    }

    if (!data) {
      return cloneDefaultMemory();
    }

    return data.memory as FounderMemory;
  }

  async save(
    ownerId: string,
    memory: FounderMemory
  ): Promise<void> {

    const {
      error,
    } =
      await this.client
        .from(this.table)
        .upsert(
          {
            owner_id:
              ownerId,
            memory,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "owner_id",
          }
        );

    if (error) {
      throw new Error(
        `Supabase memory save failed: ${error.message}`
      );
    }
  }

  async exists(
    ownerId: string
  ): Promise<boolean> {

    const {
      data,
      error,
    } =
      await this.client
        .from(this.table)
        .select(
          "id"
        )
        .eq(
          "owner_id",
          ownerId
        )
        .maybeSingle();

    if (error) {
      throw new Error(
        `Supabase memory existence check failed: ${error.message}`
      );
    }

    return data !== null;
  }

  async delete(
    ownerId: string
  ): Promise<void> {

    const {
      error,
    } =
      await this.client
        .from(this.table)
        .delete()
        .eq(
          "owner_id",
          ownerId
        );

    if (error) {
      throw new Error(
        `Supabase memory delete failed: ${error.message}`
      );
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

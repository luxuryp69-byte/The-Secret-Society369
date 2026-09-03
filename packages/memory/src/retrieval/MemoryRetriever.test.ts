import {
  describe,
  expect,
  it,
} from "vitest";

import { MemoryRetriever } from "./MemoryRetriever";
import { MemoryStore } from "../storage/MemoryStore";
import type { MemoryRecord } from "../types";

function record(
  id: string,
  type: string,
  content: unknown,
  metadata?: Record<string, unknown>,
): MemoryRecord {
  return {
    id,
    type,
    createdAt: new Date(),
    content,
    metadata,
  };
}

describe("MemoryRetriever", () => {
  it("finds records by content", async () => {
    const store = new MemoryStore();

    await store.save(
      record(
        "company-profile",
        "company_profile",
        {
          name: "Acme",
          industry: "Fintech",
        },
      ),
    );

    await store.save(
      record(
        "product-profile",
        "product_profile",
        {
          name: "Dashboard",
        },
      ),
    );

    const retriever =
      new MemoryRetriever(store);

    const results =
      await retriever.search({
        text: "fintech",
      });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(
      "company-profile",
    );
  });

  it("matches memory types", async () => {
    const store = new MemoryStore();

    await store.save(
      record(
        "company-profile",
        "company_profile",
        {
          name: "Acme",
        },
      ),
    );

    await store.save(
      record(
        "founder-profile",
        "founder_profile",
        {
          name: "Alex",
        },
      ),
    );

    const retriever =
      new MemoryRetriever(store);

    const results =
      await retriever.search({
        text: "company",
      });

    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe(
      "company_profile",
    );
  });

  it("ranks stronger matches first", async () => {
    const store = new MemoryStore();

    await store.save(
      record(
        "weak-company",
        "company_profile",
        {
          description:
            "A business that works with startups",
        },
      ),
    );

    await store.save(
      record(
        "fintech-company",
        "company_profile",
        {
          name: "Fintech Labs",
          industry: "fintech",
        },
      ),
    );

    const retriever =
      new MemoryRetriever(store);

    const results =
      await retriever.search({
        text: "fintech",
      });

    expect(results[0]?.id).toBe(
      "fintech-company",
    );
  });

  it("respects the requested limit", async () => {
    const store = new MemoryStore();

    await store.save(
      record(
        "goal:1",
        "goal",
        "Launch fintech product",
      ),
    );

    await store.save(
      record(
        "goal:2",
        "goal",
        "Research fintech market",
      ),
    );

    await store.save(
      record(
        "goal:3",
        "goal",
        "Hire fintech engineer",
      ),
    );

    const retriever =
      new MemoryRetriever(store);

    const results =
      await retriever.search({
        text: "fintech",
        limit: 2,
      });

    expect(results).toHaveLength(2);
  });

  it("returns an empty array when there is no match", async () => {
    const store = new MemoryStore();

    await store.save(
      record(
        "company-profile",
        "company_profile",
        {
          industry: "fintech",
        },
      ),
    );

    const retriever =
      new MemoryRetriever(store);

    const results =
      await retriever.search({
        text: "aviation",
      });

    expect(results).toEqual([]);
  });

  it("matches case-insensitively", async () => {
    const store = new MemoryStore();

    await store.save(
      record(
        "company-profile",
        "company_profile",
        {
          industry: "FinTech",
        },
      ),
    );

    const retriever =
      new MemoryRetriever(store);

    const results =
      await retriever.search({
        text: "FINTECH",
      });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(
      "company-profile",
    );
  });

  it("does not mutate stored records", async () => {
    const store = new MemoryStore();

    const original = record(
      "company-profile",
      "company_profile",
      {
        name: "Acme",
      },
    );

    await store.save(original);

    const retriever =
      new MemoryRetriever(store);

    await retriever.search({
      text: "acme",
    });

    const stored =
      await store.get(
        "company-profile",
      );

    expect(stored).toEqual(original);
  });

  it("returns no records for an empty query", async () => {
    const store = new MemoryStore();

    await store.save(
      record(
        "company-profile",
        "company_profile",
        {
          name: "Acme",
        },
      ),
    );

    const retriever =
      new MemoryRetriever(store);

    const results =
      await retriever.search({
        text: "",
      });

    expect(results).toEqual([]);
  });
});

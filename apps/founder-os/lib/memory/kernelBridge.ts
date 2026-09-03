import type {
  MemoryClient,
  MemoryRecord,
} from "@tnf/memory";

import { getKernel } from "@/lib/kernel/runtime";

import type {
  CompanyProfile,
  Decision,
  FounderMemory,
  FounderProfile,
  Goal,
  ProductProfile,
} from "./types";

function now(): Date {
  return new Date();
}

function createRecord(
  id: string,
  type: string,
  content: unknown,
): MemoryRecord {
  return {
    id,
    type,
    createdAt: now(),
    content,
  };
}

function profileRecord(
  id: string,
  type: string,
  profile: unknown,
): MemoryRecord {
  return createRecord(id, type, profile);
}

function founderRecord(
  founder: FounderProfile,
): MemoryRecord {
  return profileRecord(
    "founder-profile",
    "founder_profile",
    founder,
  );
}

function companyRecord(
  company: CompanyProfile,
): MemoryRecord {
  return profileRecord(
    "company-profile",
    "company_profile",
    company,
  );
}

function productRecord(
  product: ProductProfile,
): MemoryRecord {
  return profileRecord(
    "product-profile",
    "product_profile",
    product,
  );
}

function goalRecord(
  goal: Goal,
): MemoryRecord {
  return createRecord(
    `goal:${goal.id}`,
    "goal",
    goal,
  );
}

function decisionRecord(
  decision: Decision,
): MemoryRecord {
  return createRecord(
    `decision:${decision.id}`,
    "decision",
    decision,
  );
}

function stringRecord(
  type: string,
  id: string,
  content: string,
): MemoryRecord {
  return createRecord(
    `${type}:${id}`,
    type,
    content,
  );
}

export async function getKernelMemory(): Promise<MemoryClient> {
  const kernel = await getKernel();

  return kernel.container.resolve<MemoryClient>(
    "memory",
  );
}

export async function searchKernelMemory(
  query: string,
  limit = 20,
): Promise<MemoryRecord[]> {
  const memory = await getKernelMemory();

  return memory.retriever.search({
    text: query,
    limit,
  });
}

export async function syncFounderMemoryToKernel(
  founderMemory: FounderMemory,
  client?: MemoryClient,
): Promise<void> {
  const memory =
    client ?? await getKernelMemory();

  await memory.episodic.storeRecord(
    founderRecord(
      founderMemory.founder,
    ),
  );

  await memory.semantic.storeRecord(
    companyRecord(
      founderMemory.company,
    ),
  );

  await memory.semantic.storeRecord(
    productRecord(
      founderMemory.product,
    ),
  );

  for (const goal of founderMemory.goals) {
    await memory.episodic.storeRecord(
      goalRecord(goal),
    );
  }

  for (
    const decision of founderMemory.decisions
  ) {
    await memory.episodic.storeRecord(
      decisionRecord(decision),
    );
  }

  for (
    let index = 0;
    index < founderMemory.knowledge.length;
    index += 1
  ) {
    await memory.semantic.storeRecord(
      stringRecord(
        "knowledge",
        String(index),
        founderMemory.knowledge[index],
      ),
    );
  }

  for (
    let index = 0;
    index < founderMemory.insights.length;
    index += 1
  ) {
    await memory.semantic.storeRecord(
      stringRecord(
        "insight",
        String(index),
        founderMemory.insights[index],
      ),
    );
  }
}
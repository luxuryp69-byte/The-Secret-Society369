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

  const profileWrites = [
    memory.episodic.storeRecord(
      founderRecord(founderMemory.founder),
    ),
    memory.semantic.storeRecord(
      companyRecord(founderMemory.company),
    ),
    memory.semantic.storeRecord(
      productRecord(founderMemory.product),
    ),
  ];

  const goalWrites = founderMemory.goals.map(
    (goal) =>
      memory.episodic.storeRecord(
        goalRecord(goal),
      ),
  );

  const decisionWrites = founderMemory.decisions.map(
    (decision) =>
      memory.episodic.storeRecord(
        decisionRecord(decision),
      ),
  );

  const knowledgeWrites = founderMemory.knowledge.map(
    (knowledge, index) =>
      memory.semantic.storeRecord(
        stringRecord(
          "knowledge",
          String(index),
          knowledge,
        ),
      ),
  );

  const insightWrites = founderMemory.insights.map(
    (insight, index) =>
      memory.semantic.storeRecord(
        stringRecord(
          "insight",
          String(index),
          insight,
        ),
      ),
  );

  await Promise.all([
    ...profileWrites,
    ...goalWrites,
    ...decisionWrites,
    ...knowledgeWrites,
    ...insightWrites,
  ]);
}

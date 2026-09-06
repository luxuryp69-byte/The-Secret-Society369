import { createKnowledgeRepository } from "./store";
import { searchKnowledge } from "./retrieval/searchKnowledge";
import type {
  KnowledgeItem,
  KnowledgeSearchOptions,
} from "./types";

export async function listKnowledge(): Promise<KnowledgeItem[]> {
  const repository = createKnowledgeRepository();
  return repository.list();
}

export async function getKnowledge(
  id: string,
): Promise<KnowledgeItem | null> {
  const repository = createKnowledgeRepository();
  return repository.get(id);
}

export async function saveKnowledge(
  item: KnowledgeItem,
): Promise<void> {
  const repository = createKnowledgeRepository();
  await repository.save(item);
}

export async function deleteKnowledge(
  id: string,
): Promise<void> {
  const repository = createKnowledgeRepository();
  await repository.delete(id);
}

export async function searchKnowledgeLibrary(
  options: KnowledgeSearchOptions = {},
): Promise<KnowledgeItem[]> {
  const items = await listKnowledge();
  return searchKnowledge(items, options);
}

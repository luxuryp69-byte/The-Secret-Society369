import { LocalKnowledgeRepository } from "./repository/LocalKnowledgeRepository";

export function createKnowledgeRepository() {
  return new LocalKnowledgeRepository();
}

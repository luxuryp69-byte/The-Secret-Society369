import { KnowledgeGraph } from "../graph/KnowledgeGraph";
import { VectorStore } from "../vector/VectorStore";
import { KnowledgeSearch } from "../search/KnowledgeSearch";

export class KnowledgeClient {
  readonly graph = new KnowledgeGraph();

  readonly vectors = new VectorStore();

  readonly search = new KnowledgeSearch();

  async initialize(): Promise<void> {}

  async shutdown(): Promise<void> {}
}
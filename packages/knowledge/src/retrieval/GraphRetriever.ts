import { KnowledgeGraph } from "../graph/KnowledgeGraph";
import { KnowledgeEntity } from "../entities/KnowledgeEntity";

export class GraphRetriever {
  constructor(
    private readonly graph: KnowledgeGraph
  ) {}

  get(id: string): KnowledgeEntity | null {
    return this.graph.get(id) ?? null;
  }

  all(): KnowledgeEntity[] {
    return this.graph.values();
  }
}

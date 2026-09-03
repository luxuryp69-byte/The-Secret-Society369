import { EpisodicMemory } from "../episodic/EpisodicMemory";
import { SemanticMemory } from "../semantic/SemanticMemory";
import { WorkingMemory } from "../working/WorkingMemory";
import { ProfileMemory } from "../profile/ProfileMemory";
import { MemoryStore } from "../storage/MemoryStore";
import { MemoryRetriever } from "../retrieval/MemoryRetriever";
import { MemoryConsolidator } from "../consolidation/MemoryConsolidator";
import { MemoryStatistics } from "../statistics";

export class MemoryClient {
  readonly store: MemoryStore;

  readonly episodic: EpisodicMemory;

  readonly semantic: SemanticMemory;

  readonly working = new WorkingMemory();

  readonly profile = new ProfileMemory();

  readonly retriever: MemoryRetriever;

  readonly consolidator: MemoryConsolidator;

  readonly statistics: MemoryStatistics;

  constructor() {
    this.store = new MemoryStore();

    this.episodic = new EpisodicMemory(this.store);
    this.semantic = new SemanticMemory(this.store);

    this.retriever = new MemoryRetriever(this.store);

    this.consolidator = new MemoryConsolidator(
      this.episodic,
      this.semantic
    );

    this.statistics = new MemoryStatistics(this.store);
  }

  async initialize(): Promise<void> {}

  async shutdown(): Promise<void> {
    await this.store.clear();
  }

  async health(): Promise<boolean> {
    return true;
  }
}

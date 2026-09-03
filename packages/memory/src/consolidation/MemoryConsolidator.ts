import { EpisodicMemory } from "../episodic/EpisodicMemory";
import { SemanticMemory } from "../semantic/SemanticMemory";

export class MemoryConsolidator {
  constructor(
    private readonly episodic: EpisodicMemory,
    private readonly semantic: SemanticMemory
  ) {}

  async consolidate(): Promise<void> {
    const episodes = await this.episodic.all();

    for (const episode of episodes) {
      await this.semantic.storeRecord(episode);
    }
  }
}

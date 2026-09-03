import { EmbeddingModel } from "./EmbeddingModel";

export class EmbeddingService {
  constructor(
    private readonly model = new EmbeddingModel()
  ) {}

  async createEmbedding(text: string): Promise<number[]> {
    return this.model.embed(text);
  }
}

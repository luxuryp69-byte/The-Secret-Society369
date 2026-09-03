import { GraphRetriever } from "./GraphRetriever";

export class HybridRetriever {
  constructor(
    private readonly graph: GraphRetriever
  ) {}

  async retrieve(text: string): Promise<void> {
    void text;
    this.graph.all();
  }
}

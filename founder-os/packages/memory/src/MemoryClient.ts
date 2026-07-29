import type {
  MemoryRecord,
  RememberOptions,
} from "./types";

export class MemoryClient {
  async remember(
    content: string,
    options?: RememberOptions
  ) {
    console.log("Remember:", content, options);
  }

  async forget(id: string) {
    console.log("Forget:", id);
  }

  async search(query: string): Promise<MemoryRecord[]> {
    console.log("Memory Search:", query);

    return [];
  }

  async context() {
    console.log("Load Context");
  }
}
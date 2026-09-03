export interface VectorRecord {
  id: string;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload?: Record<string, unknown>;
}

export class VectorCollection {
  private readonly records = new Map<string, VectorRecord>();

  async upsert(record: VectorRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<VectorRecord | null> {
    return this.records.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async search(
    vector: number[],
    limit = 10
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const record of this.records.values()) {
      const score = this.cosineSimilarity(vector, record.vector);

      results.push({
        id: record.id,
        score,
        payload: record.payload,
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  async count(): Promise<number> {
    return this.records.size;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dot = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      magnitudeA += a[i] ** 2;
      magnitudeB += b[i] ** 2;
    }

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }
}

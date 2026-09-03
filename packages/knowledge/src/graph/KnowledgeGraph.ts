import { KnowledgeEntity } from "../entities/KnowledgeEntity";

export class KnowledgeGraph {
  private readonly entities = new Map<string, KnowledgeEntity>();

  add(entity: KnowledgeEntity): void {
    this.entities.set(entity.id, entity);
  }

  get(id: string): KnowledgeEntity | undefined {
    return this.entities.get(id);
  }

  has(id: string): boolean {
    return this.entities.has(id);
  }

  remove(id: string): boolean {
    return this.entities.delete(id);
  }

  values(): KnowledgeEntity[] {
    return [...this.entities.values()];
  }

  clear(): void {
    this.entities.clear();
  }

  size(): number {
    return this.entities.size;
  }
}
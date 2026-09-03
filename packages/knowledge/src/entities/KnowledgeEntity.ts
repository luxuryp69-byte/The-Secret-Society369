import type { KnowledgeRelation } from "../types";

export class KnowledgeEntity {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly description = "",
    public readonly relations: KnowledgeRelation[] = []
  ) {}
}
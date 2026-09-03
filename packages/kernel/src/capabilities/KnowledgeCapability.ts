import type { Capability } from "../contracts/Capability";
import type { KnowledgeClient } from "@tnf/knowledge";

export class KnowledgeCapability implements Capability {
  readonly id = "knowledge";
  readonly name = "Knowledge";
  readonly version = "1.0.0";

  constructor(
    private readonly knowledge: KnowledgeClient,
  ) {}

  async boot(): Promise<void> {
    await this.knowledge.initialize();
  }

  async shutdown(): Promise<void> {
    await this.knowledge.shutdown();
  }
}

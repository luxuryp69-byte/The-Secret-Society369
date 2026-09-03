import type { Capability } from "../contracts/Capability";
import type { MemoryClient } from "@tnf/memory";

export class MemoryCapability implements Capability {
  readonly id = "memory";
  readonly name = "Memory";
  readonly version = "1.0.0";

  constructor(
    private readonly memory: MemoryClient,
  ) {}

  async boot(): Promise<void> {
    await this.memory.initialize();
  }

  async shutdown(): Promise<void> {
    await this.memory.shutdown();
  }
}

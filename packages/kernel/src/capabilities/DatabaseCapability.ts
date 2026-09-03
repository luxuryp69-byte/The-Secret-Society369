import type { Capability } from "../contracts/Capability";
import type { DatabaseClientManager } from "@tnf/database";

export class DatabaseCapability implements Capability {
  readonly id = "database";
  readonly name = "Database";
  readonly version = "1.0.0";

  constructor(
    private readonly database: DatabaseClientManager,
  ) {}

  async boot(): Promise<void> {
    await this.database.connect();
  }

  async shutdown(): Promise<void> {
    await this.database.disconnect();
  }
}

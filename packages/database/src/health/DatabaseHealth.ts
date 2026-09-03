import type {
  DatabaseHealthStatus,
} from "../types";

import type {
  DatabaseClientManager,
} from "../client/DatabaseClientManager";

export class DatabaseHealth {
  constructor(
    private readonly clients: DatabaseClientManager
  ) {}

  async check(): Promise<DatabaseHealthStatus[]> {
    return Promise.all([
      this.checkService("postgres", this.clients.postgres),
      this.checkService("redis", this.clients.redis),
      this.checkService("neo4j", this.clients.neo4j),
      this.checkService("qdrant", this.clients.qdrant),
      this.checkService("minio", this.clients.minio),
    ]);
  }

  private async checkService(
    service: string,
    client: {
      health(): Promise<boolean>;
    }
  ): Promise<DatabaseHealthStatus> {
    const startedAt = Date.now();

    try {
      const healthy = await client.health();

      return {
        service,
        healthy,
        latency: Date.now() - startedAt,
      };
    } catch {
      return {
        service,
        healthy: false,
        latency: Date.now() - startedAt,
      };
    }
  }
}

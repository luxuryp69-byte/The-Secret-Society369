import {
  MinioClient,
  Neo4jClient,
  PostgresClient,
  QdrantClient,
  RedisClient,
} from "../index";

export class DatabaseClientManager {
  readonly postgres = new PostgresClient();
  readonly redis = new RedisClient();
  readonly neo4j = new Neo4jClient();
  readonly qdrant = new QdrantClient();
  readonly minio = new MinioClient();

  private get clients() {
    return [
      this.postgres,
      this.redis,
      this.neo4j,
      this.qdrant,
      this.minio,
    ];
  }

  async connect(): Promise<void> {
    try {
      await Promise.all(this.clients.map((client) => client.connect()));
    } catch (error) {
      await this.disconnectAfterFailedConnect();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const results = await Promise.allSettled(
      this.clients.map((client) => client.disconnect()),
    );

    const failures = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      )
      .map((result) => result.reason);

    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        "One or more database clients failed to disconnect",
      );
    }
  }

  async health(): Promise<boolean> {
    const results = await Promise.all(
      this.clients.map((client) => client.health()),
    );

    return results.every(Boolean);
  }

  private async disconnectAfterFailedConnect(): Promise<void> {
    await Promise.allSettled(
      this.clients.map((client) => client.disconnect()),
    );
  }
}

import type { DatabaseClient } from "../contracts/DatabaseClient";

export class MinioClient implements DatabaseClient {
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async health(): Promise<boolean> {
    return this.connected;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

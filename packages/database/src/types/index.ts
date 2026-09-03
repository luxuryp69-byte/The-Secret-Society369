export interface DatabaseHealthStatus {
  service: string;
  healthy: boolean;
  latency: number;
}

export interface ConnectionOptions {
  url: string;
}

export interface Pagination {
  limit?: number;
  offset?: number;
}

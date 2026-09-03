export interface HealthStatus {

    service: string;

    healthy: boolean;

    latency: number;

    timestamp: Date;

}

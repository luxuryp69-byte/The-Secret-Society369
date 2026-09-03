export interface Capability {
  readonly id: string;

  readonly name: string;

  readonly version: string;

  readonly description?: string;

  boot(): Promise<void>;

  shutdown(): Promise<void>;
}
import type { Capability } from "../contracts/Capability";

export class PluginManager {
  private readonly plugins: Capability[] = [];

  register(plugin: Capability): void {
    const existing = this.plugins.some(
      (candidate) => candidate.id === plugin.id,
    );

    if (existing) {
      throw new Error(
        `Plugin "${plugin.id}" is already registered.`,
      );
    }

    this.plugins.push(plugin);
  }

  get(id: string): Capability | undefined {
    return this.plugins.find(
      (plugin) => plugin.id === id,
    );
  }

  all(): Capability[] {
    return [...this.plugins];
  }

  has(id: string): boolean {
    return this.plugins.some(
      (plugin) => plugin.id === id,
    );
  }

  clear(): void {
    this.plugins.length = 0;
  }
}

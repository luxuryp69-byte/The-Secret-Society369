import type { Capability } from "../contracts/Capability";

export class CapabilityRegistry {
  private readonly capabilities = new Map<
    string,
    Capability
  >();

  register(capability: Capability): void {
    if (this.capabilities.has(capability.id)) {
      throw new Error(
        `Capability "${capability.id}" is already registered.`,
      );
    }

    this.capabilities.set(
      capability.id,
      capability,
    );
  }

  unregister(id: string): boolean {
    return this.capabilities.delete(id);
  }

  get(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  has(id: string): boolean {
    return this.capabilities.has(id);
  }

  all(): Capability[] {
    return [...this.capabilities.values()];
  }

  clear(): void {
    this.capabilities.clear();
  }

  get size(): number {
    return this.capabilities.size;
  }
}

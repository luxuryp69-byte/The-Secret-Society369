import type { Capability } from "../contracts/Capability";

export class CapabilityLoader {
  async load(
    capability: Capability,
  ): Promise<Capability> {
    await capability.boot();

    return capability;
  }
}

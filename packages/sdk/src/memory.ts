import type { Capability } from "./types";

export class MemoryClient implements Capability {
  readonly name = "memory";
  readonly version = "0.1.0";
}
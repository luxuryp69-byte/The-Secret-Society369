import type { Capability } from "./types";

export class ReasoningClient implements Capability {
  readonly name = "reasoning";
  readonly version = "0.1.0";
}
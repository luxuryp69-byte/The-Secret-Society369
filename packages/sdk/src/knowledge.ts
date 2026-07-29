import type { Capability } from "./types";

export class KnowledgeClient implements Capability {
  readonly name = "knowledge";
  readonly version = "0.1.0";
}
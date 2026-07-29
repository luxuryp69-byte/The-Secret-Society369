import type { Capability } from "./types";

export class WorkforceClient implements Capability {
  readonly name = "workforce";
  readonly version = "0.1.0";
}
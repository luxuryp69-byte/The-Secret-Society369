import type { Capability } from "./types";

export class ObservatoryClient implements Capability {
  readonly name = "observatory";
  readonly version = "0.1.0";
}
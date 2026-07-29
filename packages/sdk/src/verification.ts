import type { Capability } from "./types";

export class VerificationClient implements Capability {
  readonly name = "verification";
  readonly version = "0.1.0";
}
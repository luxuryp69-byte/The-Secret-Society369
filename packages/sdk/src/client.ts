import { ExecutiveKernel } from "./kernel";
import { KnowledgeClient } from "./knowledge";
import { MemoryClient } from "./memory";
import { ObservatoryClient } from "./observatory";
import { ReasoningClient } from "./reasoning";
import { VerificationClient } from "./verification";
import { WorkforceClient } from "./workforce";

export class TNFClient {
  readonly kernel = new ExecutiveKernel();

  readonly knowledge = new KnowledgeClient();
  readonly memory = new MemoryClient();
  readonly reasoning = new ReasoningClient();
  readonly verification = new VerificationClient();
  readonly workforce = new WorkforceClient();
  readonly observatory = new ObservatoryClient();
}
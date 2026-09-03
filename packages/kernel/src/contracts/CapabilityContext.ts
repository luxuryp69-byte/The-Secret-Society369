import { EventBus } from "../events/EventBus";
import { DependencyContainer } from "../runtime/DependencyContainer";

export interface CapabilityContext {
  readonly events: EventBus;

  readonly container: DependencyContainer;
}
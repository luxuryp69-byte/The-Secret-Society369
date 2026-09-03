import type { Capability } from "../contracts/Capability";

export type LifecycleState =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "stopped";

export class LifecycleManager {
  private state: LifecycleState = "idle";

  getState(): LifecycleState {
    return this.state;
  }

  async start(capabilities: Capability[]): Promise<void> {
    if (this.state === "running") {
      return;
    }

    if (this.state !== "idle" && this.state !== "stopped") {
      throw new Error(
        `Cannot start lifecycle from state "${this.state}"`,
      );
    }

    this.state = "starting";

    const started: Capability[] = [];

    try {
      for (const capability of capabilities) {
        await capability.boot();
        started.push(capability);
      }

      this.state = "running";
    } catch (error) {
      this.state = "stopping";

      let rollbackError: unknown;

      for (const capability of [...started].reverse()) {
        try {
          await capability.shutdown();
        } catch (shutdownError) {
          rollbackError ??= shutdownError;
        }
      }

      this.state = "stopped";

      if (rollbackError !== undefined) {
        throw new AggregateError(
          [error, rollbackError],
          "Lifecycle start failed and rollback also failed",
        );
      }

      throw error;
    }
  }

  async stop(capabilities: Capability[]): Promise<void> {
    if (this.state === "idle" || this.state === "stopped") {
      return;
    }

    if (this.state !== "running") {
      throw new Error(
        `Cannot stop lifecycle from state "${this.state}"`,
      );
    }

    this.state = "stopping";

    const errors: unknown[] = [];

    for (const capability of [...capabilities].reverse()) {
      try {
        await capability.shutdown();
      } catch (error) {
        errors.push(error);
      }
    }

    this.state = "stopped";

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        "One or more lifecycle shutdowns failed",
      );
    }
  }
}

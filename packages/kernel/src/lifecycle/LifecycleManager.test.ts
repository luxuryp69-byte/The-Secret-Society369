import { describe, expect, it, vi } from "vitest";

import type { Capability } from "../contracts/Capability";
import {
  LifecycleManager,
  type LifecycleState,
} from "./LifecycleManager";

function capability(
  name: string,
  boot: () => Promise<void> = async () => {},
  shutdown: () => Promise<void> = async () => {},
): Capability & { name: string } {
  return {
    id: name,
    name,
    version: "1.0.0",
    boot,
    shutdown,
  };
}

describe("LifecycleManager", () => {
  it("starts capabilities in declaration order", async () => {
    const manager = new LifecycleManager();
    const events: string[] = [];

    const capabilities = [
      capability(
        "first",
        async () => {
          events.push("first:boot");
        },
        async () => {
          events.push("first:shutdown");
        },
      ),
      capability(
        "second",
        async () => {
          events.push("second:boot");
        },
        async () => {
          events.push("second:shutdown");
        },
      ),
      capability(
        "third",
        async () => {
          events.push("third:boot");
        },
        async () => {
          events.push("third:shutdown");
        },
      ),
    ];

    await manager.start(capabilities);

    expect(events).toEqual([
      "first:boot",
      "second:boot",
      "third:boot",
    ]);

    expect(manager.getState()).toBe("running");
  });

  it("stops capabilities in reverse order", async () => {
    const manager = new LifecycleManager();
    const events: string[] = [];

    const capabilities = [
      capability("first", async () => {
        events.push("first:boot");
      }, async () => {
        events.push("first:shutdown");
      }),
      capability("second", async () => {
        events.push("second:boot");
      }, async () => {
        events.push("second:shutdown");
      }),
      capability("third", async () => {
        events.push("third:boot");
      }, async () => {
        events.push("third:shutdown");
      }),
    ];

    await manager.start(capabilities);
    events.length = 0;

    await manager.stop(capabilities);

    expect(events).toEqual([
      "third:shutdown",
      "second:shutdown",
      "first:shutdown",
    ]);

    expect(manager.getState()).toBe("stopped");
  });

  it("does not boot twice when already running", async () => {
    const manager = new LifecycleManager();
    const boot = vi.fn(async () => {});

    const capabilities = [
      capability("first", boot),
    ];

    await manager.start(capabilities);
    await manager.start(capabilities);

    expect(boot).toHaveBeenCalledTimes(1);
    expect(manager.getState()).toBe("running");
  });

  it("does not shutdown twice when already stopped", async () => {
    const manager = new LifecycleManager();
    const shutdown = vi.fn(async () => {});

    const capabilities = [
      capability("first", async () => {}, shutdown),
    ];

    await manager.start(capabilities);

    await manager.stop(capabilities);
    await manager.stop(capabilities);

    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(manager.getState()).toBe("stopped");
  });

  it("rolls back already-started capabilities when boot fails", async () => {
    const manager = new LifecycleManager();
    const events: string[] = [];

    const first = capability(
      "first",
      async () => {
        events.push("first:boot");
      },
      async () => {
        events.push("first:rollback");
      },
    );

    const second = capability(
      "second",
      async () => {
        events.push("second:boot");
        throw new Error("second boot failed");
      },
      async () => {
        events.push("second:shutdown");
      },
    );

    const third = capability(
      "third",
      async () => {
        events.push("third:boot");
      },
      async () => {
        events.push("third:shutdown");
      },
    );

    await expect(
      manager.start([first, second, third]),
    ).rejects.toThrow("second boot failed");

    expect(events).toEqual([
      "first:boot",
      "second:boot",
      "first:rollback",
    ]);

    expect(manager.getState()).toBe("stopped");
  });

  it("does not rollback a capability whose boot failed", async () => {
    const manager = new LifecycleManager();
    const shutdown = vi.fn(async () => {});

    const failing = capability(
      "failing",
      async () => {
        throw new Error("boot failed");
      },
      shutdown,
    );

    await expect(
      manager.start([failing]),
    ).rejects.toThrow("boot failed");

    expect(shutdown).not.toHaveBeenCalled();
    expect(manager.getState()).toBe("stopped");
  });

  it("continues shutdown when one capability fails", async () => {
    const manager = new LifecycleManager();
    const events: string[] = [];

    const first = capability(
      "first",
      async () => {},
      async () => {
        events.push("first:shutdown");
      },
    );

    const second = capability(
      "second",
      async () => {},
      async () => {
        events.push("second:shutdown");
        throw new Error("second shutdown failed");
      },
    );

    const third = capability(
      "third",
      async () => {},
      async () => {
        events.push("third:shutdown");
      },
    );

    await manager.start([first, second, third]);

    await expect(
      manager.stop([first, second, third]),
    ).rejects.toThrow("second shutdown failed");

    expect(events).toEqual([
      "third:shutdown",
      "second:shutdown",
      "first:shutdown",
    ]);

    expect(manager.getState()).toBe("stopped");
  });

  it("rejects start while stopping", async () => {
    const manager = new LifecycleManager();

    const shutdownStarted = new Promise<void>(() => {});

    const capabilities = [
      capability(
        "first",
        async () => {},
        async () => {
          await shutdownStarted;
        },
      ),
    ];

    await manager.start(capabilities);

    const stopPromise = manager.stop(capabilities);

    expect(manager.getState()).toBe("stopping");

    await expect(
      manager.start(capabilities),
    ).rejects.toThrow(
      'Cannot start lifecycle from state "stopping"',
    );

    void stopPromise;
  });

  it("rejects stop while starting", async () => {
    const manager = new LifecycleManager();

    const bootStarted = new Promise<void>(() => {});

    const capabilities = [
      capability("first", async () => {
        await bootStarted;
      }),
    ];

    const startPromise = manager.start(capabilities);

    expect(manager.getState()).toBe("starting");

    await expect(
      manager.stop(capabilities),
    ).rejects.toThrow(
      'Cannot stop lifecycle from state "starting"',
    );

    void startPromise;
  });

  it("can start again after a clean stop", async () => {
    const manager = new LifecycleManager();
    const boot = vi.fn(async () => {});
    const shutdown = vi.fn(async () => {});

    const capabilities = [
      capability("first", boot, shutdown),
    ];

    await manager.start(capabilities);
    await manager.stop(capabilities);
    await manager.start(capabilities);

    expect(boot).toHaveBeenCalledTimes(2);
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(manager.getState()).toBe("running");
  });

  it("starts from the stopped state", async () => {
    const manager = new LifecycleManager();
    const boot = vi.fn(async () => {});
    const shutdown = vi.fn(async () => {});

    const capabilities = [
      capability("first", boot, shutdown),
    ];

    await manager.start(capabilities);
    await manager.stop(capabilities);
    await manager.start(capabilities);

    expect(manager.getState()).toBe("running");
  });

  it("reports the expected state transitions", async () => {
    const manager = new LifecycleManager();
    const states: LifecycleState[] = [];

    const capabilities = [
      capability(
        "first",
        async () => {
          states.push(manager.getState());
        },
        async () => {
          states.push(manager.getState());
        },
      ),
    ];

    expect(manager.getState()).toBe("idle");

    await manager.start(capabilities);

    expect(states).toEqual(["starting"]);
    expect(manager.getState()).toBe("running");

    await manager.stop(capabilities);

    expect(states).toEqual([
      "starting",
      "stopping",
    ]);
    expect(manager.getState()).toBe("stopped");
  });
});

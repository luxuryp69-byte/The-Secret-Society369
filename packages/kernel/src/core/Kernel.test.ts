import { describe, expect, it } from "vitest";

import { Kernel } from "./Kernel";

describe("Kernel", () => {
  it("starts uninitialized", () => {
    const kernel = new Kernel();

    expect(kernel.isInitialized()).toBe(false);
  });

  it("initializes successfully", async () => {
    const kernel = new Kernel();

    await kernel.initialize();

    expect(kernel.isInitialized()).toBe(true);

    await kernel.shutdown();
  });

  it("is idempotent when initialized twice", async () => {
    const kernel = new Kernel();

    await kernel.initialize();
    await kernel.initialize();

    expect(kernel.isInitialized()).toBe(true);

    await kernel.shutdown();
  });

  it("shuts down successfully", async () => {
    const kernel = new Kernel();

    await kernel.initialize();
    await kernel.shutdown();

    expect(kernel.isInitialized()).toBe(false);
  });

  it("is idempotent when shut down twice", async () => {
    const kernel = new Kernel();

    await kernel.initialize();

    await kernel.shutdown();
    await kernel.shutdown();

    expect(kernel.isInitialized()).toBe(false);
  });

  it("supports a complete restart cycle", async () => {
    const kernel = new Kernel();

    await kernel.initialize();
    expect(kernel.isInitialized()).toBe(true);

    await kernel.shutdown();
    expect(kernel.isInitialized()).toBe(false);

    await kernel.initialize();
    expect(kernel.isInitialized()).toBe(true);

    await kernel.shutdown();
  });

  it("registers core dependencies during initialization", async () => {
    const kernel = new Kernel();

    await kernel.initialize();

    expect(kernel.container.has("database")).toBe(true);
    expect(kernel.container.has("databaseHealth")).toBe(true);
    expect(kernel.container.has("memory")).toBe(true);
    expect(kernel.container.has("knowledge")).toBe(true);
    expect(kernel.container.has("events")).toBe(true);
    expect(kernel.container.has("kernel")).toBe(true);

    expect(kernel.container.resolve("kernel")).toBe(kernel);

    await kernel.shutdown();
  });
});

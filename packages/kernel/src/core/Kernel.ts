import {
  DatabaseClientManager,
  DatabaseHealth,
} from "@tnf/database";

import {
  MemoryClient,
} from "@tnf/memory";

import {
  KnowledgeClient,
} from "@tnf/knowledge";

import { EventBus } from "../events/EventBus";
import { LifecycleManager } from "../lifecycle/LifecycleManager";
import { DependencyContainer } from "../runtime/DependencyContainer";

import {
  DatabaseCapability,
  KnowledgeCapability,
  MemoryCapability,
} from "../capabilities";

export class Kernel {
  readonly database = new DatabaseClientManager();

  readonly databaseHealth = new DatabaseHealth(this.database);

  readonly memory = new MemoryClient();

  readonly knowledge = new KnowledgeClient();

  readonly events = new EventBus();

  readonly container = new DependencyContainer();

  readonly lifecycle = new LifecycleManager();

  private readonly capabilities = [
    new DatabaseCapability(this.database),
    new MemoryCapability(this.memory),
    new KnowledgeCapability(this.knowledge),
  ];

  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.container.register("database", this.database);
    this.container.register("databaseHealth", this.databaseHealth);
    this.container.register("memory", this.memory);
    this.container.register("knowledge", this.knowledge);
    this.container.register("events", this.events);
    this.container.register("kernel", this);

    await this.lifecycle.start(this.capabilities);

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.lifecycle.stop(this.capabilities);
    } finally {
      this.container.clear();
this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export type EventHandler<T = unknown> = (
  payload: T,
) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<
    string,
    EventHandler[]
  >();

  on<T = unknown>(
    event: string,
    handler: EventHandler<T>,
  ): () => void {
    const list =
      this.handlers.get(event) ?? [];

    list.push(
      handler as EventHandler,
    );

    this.handlers.set(
      event,
      list,
    );

    return () => {
      this.off(event, handler);
    };
  }

  off<T = unknown>(
    event: string,
    handler: EventHandler<T>,
  ): boolean {
    const list =
      this.handlers.get(event);

    if (!list) {
      return false;
    }

    const index = list.indexOf(
      handler as EventHandler,
    );

    if (index === -1) {
      return false;
    }

    list.splice(index, 1);

    if (list.length === 0) {
      this.handlers.delete(event);
    }

    return true;
  }

  async emit<T = unknown>(
    event: string,
    payload?: T,
  ): Promise<void> {
    const list = [
      ...(this.handlers.get(event) ?? []),
    ];

    for (const handler of list) {
      await handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

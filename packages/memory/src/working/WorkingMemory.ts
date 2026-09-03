export class WorkingMemory<T = unknown> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  clear(): void {
    this.items = [];
  }

  getAll(): T[] {
    return [...this.items];
  }

  size(): number {
    return this.items.length;
  }
}

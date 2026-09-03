export class ProfileMemory {
  private profile = new Map<string, unknown>();

  set(key: string, value: unknown): void {
    this.profile.set(key, value);
  }

  get<T = unknown>(key: string): T | undefined {
    return this.profile.get(key) as T | undefined;
  }

  all(): Record<string, unknown> {
    return Object.fromEntries(this.profile);
  }
}

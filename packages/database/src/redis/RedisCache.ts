export class RedisCache {
  private readonly storage = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    const value = this.storage.get(key);

    if (value === undefined) {
      return null;
    }

    return value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

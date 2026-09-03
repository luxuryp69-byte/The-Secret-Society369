export interface StoredObject {
  key: string;
  data: unknown;
  metadata?: Record<string, string>;
}

export class ObjectStorage {
  private readonly objects = new Map<string, StoredObject>();

  async upload(
    key: string,
    data: unknown,
    metadata?: Record<string, string>
  ): Promise<void> {
    this.objects.set(key, {
      key,
      data,
      metadata,
    });
  }

  async download<T = unknown>(key: string): Promise<T | null> {
    const object = this.objects.get(key);

    if (!object) {
      return null;
    }

    return object.data as T;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async list(): Promise<StoredObject[]> {
    return Array.from(this.objects.values());
  }

  async clear(): Promise<void> {
    this.objects.clear();
  }
}

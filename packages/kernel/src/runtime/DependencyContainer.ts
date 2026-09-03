export class DependencyContainer {
  private readonly services = new Map<
    string,
    unknown
  >();

  register<T>(
    key: string,
    value: T,
  ): void {
    if (this.services.has(key)) {
      throw new Error(
        `Dependency "${key}" is already registered.`,
      );
    }

    this.services.set(key, value);
  }

  replace<T>(
    key: string,
    value: T,
  ): void {
    this.services.set(key, value);
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);

    if (service === undefined) {
      throw new Error(
        `Dependency "${key}" not found.`,
      );
    }

    return service as T;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  remove(key: string): boolean {
    return this.services.delete(key);
  }

  clear(): void {
    this.services.clear();
  }
}

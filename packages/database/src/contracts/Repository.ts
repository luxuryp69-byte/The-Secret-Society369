export interface Repository<T> {
  findById(id: string): Promise<T | null>;

  findAll(): Promise<T[]>;

  create(entity: T): Promise<void>;

  update(id: string, entity: Partial<T>): Promise<void>;

  delete(id: string): Promise<void>;
}

import type { Repository } from "../contracts/Repository";

export class PostgresRepository<T> implements Repository<T> {
  async findById(_id: string): Promise<T | null> {
    throw new Error(
      "PostgresRepository.findById is not implemented yet"
    );
  }

  async findAll(): Promise<T[]> {
    throw new Error(
      "PostgresRepository.findAll is not implemented yet"
    );
  }

  async create(_entity: T): Promise<void> {
    throw new Error(
      "PostgresRepository.create is not implemented yet"
    );
  }

  async update(
    _id: string,
    _entity: Partial<T>
  ): Promise<void> {
    throw new Error(
      "PostgresRepository.update is not implemented yet"
    );
  }

  async delete(_id: string): Promise<void> {
    throw new Error(
      "PostgresRepository.delete is not implemented yet"
    );
  }
}

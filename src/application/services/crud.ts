import type { IRepository, Query } from "../../domain/mongo.interface.js";
import type { MongoDocument } from "#root/domain/models/mongodocument.js";
import type { DeleteResult } from "mongodb";

/**
 * Generic CRUD service that delegates operations
 * to the injected repository implementation.
 *
 * @template T - The domain entity type
 */
export class CrudService<T> implements IRepository<T> {
  private readonly repository: IRepository<T>;

  /**
   * Creates a new CrudService.
   * @param {IRepository} repository - The repository implementing persistence
   */
  public constructor(repository: IRepository<T>) {
    this.repository = repository;
  }

  /**
   * Creates a new entity.
   * @param {T} data - Generic Data.
   * @returns {MongoDocument<T> | null} - If the document is stored will reply the stored doc, otherwise null.
   */
  public async create(data: T): Promise<MongoDocument<T> | null> {
    return this.repository.create(data);
  }

  /**
   * Reads an entity by ID.
   * @param {string} id -ID of stored document.
   *
   */
  public async read(id: string): Promise<MongoDocument<T> | null> {
    return this.repository.read(id);
  }

  /**
   * Updates an entity by ID.
   * @param id
   * @param data
   */
  public async update(
    id: string,
    data: Partial<T>,
  ): Promise<MongoDocument<T> | null> {
    return this.repository.update(id, data);
  }

  /**
   * Removes an entity by ID.
   * @param id
   */
  public async remove(id: string): Promise<DeleteResult> {
    return this.repository.remove(id);
  }

  /**
   * Finds entities matching a query.
   * @param query
   */
  public async find(query: Query<T>): Promise<MongoDocument<T>[]> {
    return this.repository.find(query);
  }

  /**
   * Finds a single entity matching a query.
   * @param query
   */
  public async findOne(query: Query<T>): Promise<MongoDocument<T> | null> {
    return this.repository.findOne(query);
  }
}

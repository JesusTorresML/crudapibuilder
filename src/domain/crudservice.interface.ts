import type { MongoDocument } from "./models/mongodocument";
import type { PaginatedResult, PaginationOptions } from "./mongo.interface";

/**
 * Defines the contract for a generic application service. This interface
 * outlines the standard business logic operations for a given entity,
 * acting as a bridge between the presentation layer (controllers) and the
 * data persistence layer (repositories).
 *
 * @template TEntity The domain entity type.
 */
export interface IService<TEntity> {
  /**
   * Creates a new entity after performing business logic validation.
   *
   * @param {TEntity} data - The entity data to be created.
   * @returns {Promise<MongoDocument<TEntity>>} A promise that resolves to the newly created entity.
   * @throws {ValidationError} When the entity data fails business validation rules.
   * @throws {ApplicationError} When the creation operation fails for other reasons (e.g., database error).
   */
  create(data: TEntity): Promise<MongoDocument<TEntity> | null>;

  /**
   * Retrieves a single entity by its unique identifier.
   *
   * @param {string} id - The unique identifier of the entity to retrieve.
   * @returns {Promise<MongoDocument<TEntity>>} A promise that resolves to the found entity.
   * @throws {NotFoundError} When no entity with the given ID is found.
   * @throws {ApplicationError} For other database-related failures.
   */
  read(id: string): Promise<MongoDocument<TEntity>>;

  /**
   * Updates an existing entity with partial data after performing business logic validation.
   *
   * @param {string} id - The unique identifier of the entity to update.
   * @param {Partial<TEntity>} data - An object containing the fields to update.
   * @returns {Promise<MongoDocument<TEntity>>} A promise that resolves to the updated entity.
   * @throws {NotFoundError} When no entity with the given ID is found.
   * @throws {ValidationError} When the update data fails business validation.
   * @throws {ApplicationError} For other update failures.
   */
  update(id: string, data: Partial<TEntity>): Promise<MongoDocument<TEntity>>;

  /**
   * Permanently removes an entity from the system after checking business rules.
   *
   * @param {string} id - The unique identifier of the entity to remove.
   * @returns {Promise<void>} A promise that resolves when the entity has been successfully removed.
   * @throws {NotFoundError} When no entity with the given ID is found.
   * @throws {ApplicationError} If the removal is not permitted by business rules or if a database error occurs.
   */
  remove(id: string): Promise<void>;

  /**
   * Finds multiple entities that match the specified query criteria, with pagination.
   *
   * @param {Partial<TEntity>} query - The query criteria for filtering entities.
   * @param {PaginationOptions} [options] - Optional parameters for pagination and sorting.
   * @returns {Promise<PaginatedResult<MongoDocument<TEntity>>>} A promise that resolves to the paginated list of found entities.
   * @throws {ValidationError} If the query or pagination parameters are invalid.
   * @throws {ApplicationError} For database-related query failures.
   */
  find(
    query: Partial<TEntity>,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<MongoDocument<TEntity>>>;
}

import type { MongoDocument } from "./models/mongodocument";

/**
 * Generic repository interface that defines the contract for data persistence
 * operations. Provides consistent CRUD operations across different entity types.
 *
 * @template TEntity - The domain entity type
 * @template TQuery - The query type for filtering entities
 */
export interface IRepository<TEntity> {
  /**
   * Creates a new entity in the persistence layer.
   *
   * @param {TEntity} data - The entity data to be persisted
   * @returns {Promise<MongoDocument<TEntity> | null>} Created entity with metadata or null if creation failed
   * @throws {ApplicationError} When creation fails due to validation or persistence issues
   */
  create(data: TEntity): Promise<MongoDocument<TEntity> | null>;

  /**
   * Retrieves a single entity by its unique identifier.
   *
   * @param {string} id - The unique identifier of the entity
   * @returns {Promise<MongoDocument<TEntity> | null>} Found entity or null if not exists
   * @throws {ApplicationError} When database operation fails
   */
  read(id: string): Promise<MongoDocument<TEntity> | null>;

  /**
   * Updates an existing entity with partial data.
   *
   * @param {string} id - The unique identifier of the entity to update
   * @param {Partial<TEntity>} data - Partial entity data for updates
   * @returns {Promise<MongoDocument<TEntity> | null>} Updated entity or null if not found
   * @throws {ApplicationError} When update operation fails
   */
  update(
    id: string,
    data: Partial<TEntity>,
  ): Promise<MongoDocument<TEntity> | null>;

  /**
   * Permanently removes an entity from the persistence layer.
   *
   * @param {string} id - The unique identifier of the entity to remove
   * @returns {Promise<boolean>} True if entity was deleted, false if not found
   * @throws {ApplicationError} When deletion operation fails
   */
  remove(id: string): Promise<boolean>;

  /**
   * Finds multiple entities matching the specified query criteria.
   *
   * @param {TQuery} query - Query criteria for filtering entities
   * @param {PaginationOptions} [options] - Optional pagination parameters
   * @returns {Promise<PaginatedResult<MongoDocument<TEntity>>>} Paginated results matching query
   * @throws {ApplicationError} When query operation fails
   */
  find(
    query: Partial<TEntity>,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<MongoDocument<TEntity>>>;

  /**
   * Finds the first entity matching the specified query criteria.
   *
   * @param {TQuery} query - Query criteria for finding entity
   * @returns {Promise<MongoDocument<TEntity> | null>} First matching entity or null
   * @throws {ApplicationError} When query operation fails
   */
  findOne(query: Partial<TEntity>): Promise<MongoDocument<TEntity> | null>;

  /**
   * Counts the total number of entities matching the query criteria.
   *
   * @param {TQuery} query - Query criteria for counting entities
   * @returns {Promise<number>} Total count of matching entities
   * @throws {ApplicationError} When count operation fails
   */
  count(query: Partial<TEntity>): Promise<number>;
}

/**
 * Pagination configuration options for controlling result sets.
 * Provides consistent pagination across different repository implementations.
 */
export interface PaginationOptions {
  /** Number of records to skip (offset) */
  skip?: number;
  /** Maximum number of records to return */
  limit?: number;
  /** Field name to sort by */
  sortBy?: string;
  /** Sort direction: ascending (1) or descending (-1) */
  sortOrder?: 1 | -1;
}

/**
 * Standardized paginated result structure that includes both data
 * and metadata about the pagination state.
 *
 * @template T - The type of entities in the result set
 */
export interface PaginatedResult<T> {
  /** Array of entities for current page */
  data: T[];
  /** Current page offset */
  skip: number;
  /** Number of entities per page */
  limit: number;
  /** Total count of entities matching query */
  total: number;
  /** Whether there are more pages available */
  hasNext: boolean;
  /** Whether there are previous pages available */
  hasPrevious: boolean;
}

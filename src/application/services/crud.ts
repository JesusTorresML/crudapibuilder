import { ApplicationError, ErrorType } from "#config/errors.js";
import type { IService, IRepository, MongoDocument } from "#domain/index.js";
import type {
  Logger,
  PaginatedResult,
  PaginationOptions,
} from "#domain/index.js";

/**
 * Generic CRUD service that implements business logic and orchestrates
 * repository operations. Acts as the application layer between controllers
 * and data persistence, ensuring business rules are enforced.
 *
 * @template TEntity - The domain entity type
 * @template TQuery - The query type for filtering operations
 */
export class CrudService<TEntity> implements IService<TEntity> {
  /**
   * Creates a new CRUD service instance with repository dependency injection.
   *
   * @param {IRepository<TEntity, TQuery>} repository - Repository for data persistence operations
   * @param {Logger} logger - Logger instance for operation tracking and debugging
   */
  public constructor(
    private readonly repository: IRepository<TEntity>,
    private readonly logger: Logger,
  ) {}

  /**
   * Creates a new entity after performing business logic validation.
   * Logs operation details and handles business rule enforcement.
   *
   * @param {TEntity} data - Entity data to be created
   * @returns {Promise<MongoDocument<TEntity>>} Created entity with metadata
   * @throws {ValidationError} When entity data fails business validation
   * @throws {ApplicationError} When creation operation fails
   */
  public async create(data: TEntity): Promise<MongoDocument<TEntity>> {
    this.logger.debug("Service: Creating new entity", { data });

    const result = await this.repository.create(data);

    if (!result) {
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Failed to create entity",
        statusCode: 500,
      });
    }

    this.logger.info("Service: Entity created successfully", {
      entityId: result._id,
      createdAt: result.createdAt,
    });

    return result;
  }

  /**
   * Retrieves an entity by ID with additional business logic checks.
   *
   * @param {string} id - Unique identifier of the entity
   * @returns {Promise<MongoDocument<TEntity>>} Retrieved entity with metadata
   * @throws {ApplicationError} When entity is not found or access is denied
   */
  public async read(id: string): Promise<MongoDocument<TEntity>> {
    this.logger.debug("Service: Reading entity by ID", { id });

    const result: MongoDocument<TEntity> | null =
      await this.repository.read(id);

    if (!result) {
      throw new ApplicationError({
        type: ErrorType.NOT_FOUND_ERROR,
        message: `Entity with ID ${id} not found`,
        statusCode: 404,
        metadata: { requestedId: id },
      });
    }

    this.logger.debug("Service: Entity retrieved successfully", {
      entityId: result._id,
    });

    return result;
  }

  /**
   * Updates an existing entity with business logic validation.
   *
   * @param {string} id - Unique identifier of the entity to update
   * @param {Partial<TEntity>} data - Partial entity data for updates
   * @returns {Promise<MongoDocument<TEntity>>} Updated entity with metadata
   * @throws {ValidationError} When update data fails validation
   * @throws {ApplicationError} When entity not found or update fails
   */
  public async update(
    id: string,
    data: Partial<TEntity>,
  ): Promise<MongoDocument<TEntity>> {
    this.logger.debug("Service: Updating entity", { id, data });

    const result: MongoDocument<TEntity> | null = await this.repository.update(
      id,
      data,
    );

    if (!result) {
      throw new ApplicationError({
        type: ErrorType.NOT_FOUND_ERROR,
        message: `Entity with ID ${id} not found for update`,
        statusCode: 404,
        metadata: { requestedId: id, updateData: data },
      });
    }

    this.logger.info("Service: Entity updated successfully", {
      entityId: result._id,
    });

    return result;
  }

  /**
   * Removes an entity with business logic checks and cascading operations.
   *
   * @param {string} id - Unique identifier of the entity to remove
   * @returns {Promise<void>} Resolves when entity is successfully removed
   * @throws {ApplicationError} When entity not found or removal fails
   */
  public async remove(id: string): Promise<void> {
    this.logger.debug("Service: Removing entity", { id });

    // Check if entity exists and validate removal permissions
    await this.read(id);

    const removed: boolean = await this.repository.remove(id);

    if (!removed) {
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Failed to remove entity - operation unsuccessful",
        statusCode: 500,
        metadata: { entityId: id },
      });
    }

    this.logger.info("Service: Entity removed successfully", { entityId: id });

    return;
  }

  /**
   * Finds entities matching query criteria with business logic filtering.
   *
   * @param {TQuery} query - Query criteria for entity filtering
   * @param {PaginationOptions} [options] - Optional pagination parameters
   * @returns {Promise<PaginatedResult<MongoDocument<TEntity>>>} Paginated results
   * @throws {ValidationError} When query parameters are invalid
   */
  public async find(
    query: Partial<TEntity>,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<MongoDocument<TEntity>>> {
    this.logger.debug("Service: Finding entities with query", {
      query,
      options,
    });

    const result = await this.repository.find(query, options);

    this.logger.debug("Service: Found entities", {
      count: result.data.length,
      total: result.total,
    });
    return result;
  }
}

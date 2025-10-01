import type {
  Collection,
  Db,
  Document,
  Filter,
  FindOptions,
  MongoClient,
  OptionalUnlessRequiredId,
  IndexDescription,
  CollectionInfo,
} from "mongodb";
import { ObjectId, MongoServerError } from "mongodb";
import type { IRepository } from "#root/domain/index.js";
import { ValidationError, ApplicationError } from "#root/config/errors.js";
import { ErrorType } from "#root/config/errors.js";
import type { Logger } from "#root/domain/logger.interface";
import type { MongoDocument } from "#root/domain/models/mongodocument";
import type { PaginatedResult, PaginationOptions } from "#root/domain/index.js";

/**
 * Enhanced MongoDB repository with proper error handling that integrates
 * seamlessly with the global error handler pattern.
 *
 * @template TEntity The domain entity type.
 * @template TQuery The query type for filtering entities.
 */
export class MongoDbRepository<TEntity extends Document>
  implements IRepository<TEntity>
{
  protected readonly collection: Collection<MongoDocument<TEntity>>;
  private readonly collectionName: string;
  private readonly uniqueFields: (keyof TEntity)[] | undefined;
  private readonly logger: Logger;
  private readonly db: Db;

  /**
   *
   * @param {MongoClient} mongoClient - Mongoclient
   * @param {string} dbName - Database Name
   * @param {string} collectionName - Collection Name
   * @param {(keyof TEntity)[] | undefined} uniqueFields - Unique field to setup indexes
   * @param {Logger} logger - Winston logger instance
   */
  public constructor(
    mongoClient: MongoClient,
    dbName: string,
    collectionName: string,
    uniqueFields: (keyof TEntity)[] | undefined,
    logger: Logger,
  ) {
    this.collectionName = collectionName;
    this.uniqueFields = uniqueFields;
    this.db = mongoClient.db(dbName);
    this.collection =
      this.db.collection<MongoDocument<TEntity>>(collectionName);
    this.logger = logger;
  }
  /**
   * Initializes the repository collection and creates indexes if it doesn't exist.
   * @returns {Promise<boolean>} True if the collection was created, false if it already existed
   */
  public async initCollections(): Promise<boolean> {
    const collectionsList: CollectionInfo[] = await this.db
      .listCollections({ name: this.collectionName })
      .toArray();

    const isNewCollection = collectionsList.length === 0;

    if (isNewCollection) {
      await this.db.createCollection(this.collectionName);
    }

    await this.createIndexes();
    return isNewCollection;
  }

  /**
   * Creates a new entity with comprehensive error handling.
   * Throws structured errors that are handled by the global error handler.
   *
   * @param {TEntity} data - Entity data to create
   * @returns {Promise<MongoDocument<TEntity> | null>} Created entity or null if duplicate
   * @throws {ApplicationError} When database operation fails
   */
  public async create(data: TEntity): Promise<MongoDocument<TEntity> | null> {
    try {
      // Validate unique constraints before creation
      const isValid = await this.validateUniqueConstraints(data);
      if (!isValid) {
        // Return null for duplicate detection (business logic decision)
        this.logger.warn(
          "Create operation failed: duplicate constraint violation",
          {
            data,
            uniqueFields: this.uniqueFields,
          },
        );
        return null;
      }

      const document: MongoDocument<TEntity> = {
        _id: new ObjectId(),
        createdAt: new Date(),
        ...data,
      };

      await this.collection.insertOne(
        document as OptionalUnlessRequiredId<MongoDocument<TEntity>>,
      );

      this.logger.debug("Entity created successfully", {
        entityId: document._id,
        collectionName: this.collectionName,
      });

      return document;
    } catch (error) {
      this.logger.error("Create operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        data,
        collectionName: this.collectionName,
      });

      // Handle MongoDB duplicate key errors
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ApplicationError({
          type: ErrorType.DUPLICATE_ERROR,
          message: "Duplicate value detected",
          statusCode: 409,
          metadata: {
            duplicateField: this.extractDuplicateField(error.message),
            collectionName: this.collectionName,
            operation: "create",
          },
        });
      }

      // Handle other database errors
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed during entity creation",
        statusCode: 500,
        metadata: {
          operation: "create",
          collectionName: this.collectionName,
          originalError:
            error instanceof Error ? error.message : "Unknown error",
        },
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Reads an entity by ID with proper error handling.
   *
   * @param {string} id - Entity identifier
   * @returns {Promise<MongoDocument<TEntity> | null>} Found entity or null
   * @throws {ApplicationError} When database operation fails
   */
  public async read(id: string): Promise<MongoDocument<TEntity> | null> {
    try {
      let objectId: ObjectId;

      // Validate ObjectId format
      try {
        objectId = new ObjectId(id);
      } catch {
        throw new ValidationError({
          message: "Invalid entity identifier format",
          field: "id",
          violations: ["ID must be a valid MongoDB ObjectId format"],
        });
      }

      const document = await this.collection.findOne({
        _id: objectId,
      } as Filter<MongoDocument<TEntity>>);

      if (document) {
        this.logger.debug("Entity retrieved successfully", {
          entityId: objectId,
          collectionName: this.collectionName,
        });
      }

      return document as MongoDocument<TEntity> | null;
    } catch (error) {
      // Re-throw validation errors as-is
      if (error instanceof ValidationError) {
        throw error;
      }

      this.logger.error("Read operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        collectionName: this.collectionName,
      });

      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed during entity retrieval",
        statusCode: 500,
        metadata: {
          operation: "read",
          entityId: id,
          collectionName: this.collectionName,
          originalError:
            error instanceof Error ? error.message : "Unknown error",
        },
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Updates an entity with comprehensive error handling.
   *
   * @param {string} id - Entity identifier
   * @param {Partial<TEntity>} data - Update data
   * @returns {Promise<MongoDocument<TEntity> | null>} Updated entity or null if not found
   * @throws {ApplicationError} When database operation fails
   */
  public async update(
    id: string | ObjectId,
    data: Partial<TEntity>,
  ): Promise<MongoDocument<TEntity> | null> {
    try {
      let objectId: ObjectId;

      // Validate ObjectId format
      try {
        objectId = typeof id === "string" ? new ObjectId(id) : id;
      } catch {
        throw new ValidationError({
          message: "Invalid entity identifier format",
          field: "id",
          violations: ["ID must be a valid MongoDB ObjectId format"],
        });
      }

      // Validate unique constraints for update
      const isValid = await this.validateUniqueConstraints(data, objectId);
      if (!isValid) {
        throw new ApplicationError({
          type: ErrorType.DUPLICATE_ERROR,
          message: "Update would violate unique constraint",
          statusCode: 409,
          metadata: {
            entityId: id,
            updateData: data,
            uniqueFields: this.uniqueFields,
            operation: "update",
          },
        });
      }

      const result = await this.collection.findOneAndUpdate(
        { _id: objectId } as Filter<MongoDocument<TEntity>>,
        { $set: data as Partial<MongoDocument<TEntity>> },
        { returnDocument: "after" },
      );

      if (result) {
        this.logger.debug("Entity updated successfully", {
          entityId: objectId,
          collectionName: this.collectionName,
          updatedFields: Object.keys(data),
        });
      }

      return result as MongoDocument<TEntity> | null;
    } catch (error) {
      // Re-throw application errors as-is
      if (
        error instanceof ApplicationError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      this.logger.error("Update operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        data,
        collectionName: this.collectionName,
      });

      // Handle MongoDB duplicate key errors
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ApplicationError({
          type: ErrorType.DUPLICATE_ERROR,
          message: "Update would create duplicate value",
          statusCode: 409,
          metadata: {
            duplicateField: this.extractDuplicateField(error.message),
            entityId: id,
            operation: "update",
          },
        });
      }

      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed during entity update",
        statusCode: 500,
        metadata: {
          operation: "update",
          entityId: id,
          collectionName: this.collectionName,
          originalError:
            error instanceof Error ? error.message : "Unknown error",
        },
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Permanently removes an entity from the persistence layer by its ID.
   *
   * @param {string} id - The unique identifier of the entity to remove.
   * @returns {Promise<boolean>} True if the entity was deleted, false if it was not found.
   * @throws {ValidationError} If the provided ID is not a valid ObjectId format.
   * @throws {ApplicationError} When the deletion operation fails for other reasons.
   */
  public async remove(id: string): Promise<boolean> {
    this.logger.debug("Repository: Attempting to remove entity", { id });
    try {
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        throw new ValidationError({
          message: "Invalid entity identifier format",
          field: "id",
        });
      }

      const result = await this.collection.deleteOne({
        _id: objectId,
      } as Filter<MongoDocument<TEntity>>);

      const wasDeleted = result.deletedCount === 1;
      if (wasDeleted) {
        this.logger.info("Repository: Entity removed successfully", { id });
      } else {
        this.logger.warn("Repository: Entity to remove was not found", { id });
      }

      return wasDeleted;
    } catch (error) {
      if (error instanceof ValidationError) throw error; // Re-throw validation errors

      this.logger.error("Repository: Remove operation failed", { error });
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed during entity removal.",
        cause: error as Error,
      });
    }
  }

  /**
   * Finds multiple entities matching the specified query criteria with pagination.
   *
   * @param {TQuery} query - The query criteria for filtering entities.
   * @param {PaginationOptions} [options] - Optional pagination and sorting parameters.
   * @returns {Promise<PaginatedResult<MongoDocument<TEntity>>>} A paginated list of results.
   * @throws {ApplicationError} When the query operation fails.
   */
  public async find(
    query: Partial<TEntity>,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<MongoDocument<TEntity>>> {
    this.logger.debug("Repository: Finding entities with query", {
      query,
      options,
    });
    try {
      // Set default pagination and sorting options
      const {
        skip = 0,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = -1,
      } = options;

      const mongoQuery = query as Filter<MongoDocument<TEntity>>;
      const findOptions: FindOptions = {
        skip,
        limit,
        sort: { [sortBy]: sortOrder },
      };

      // Run count and find queries in parallel for efficiency
      const [total, data] = await Promise.all([
        this.collection.countDocuments(mongoQuery),
        this.collection.find(mongoQuery, findOptions).toArray(),
      ]);

      const hasNext = skip + limit < total;
      const hasPrevious = skip > 0;

      this.logger.debug("Repository: Find operation successful", {
        found: data.length,
        total,
      });

      return {
        data: data as MongoDocument<TEntity>[],
        total,
        skip,
        limit,
        hasNext,
        hasPrevious,
      };
    } catch (error) {
      this.logger.error("Repository: Find operation failed", { error });
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed during entity search.",
        cause: error as Error,
      });
    }
  }

  /**
   * Finds the first entity that matches the specified query criteria.
   *
   * @param {TQuery} query - The query criteria for finding the entity.
   * @returns {Promise<MongoDocument<TEntity> | null>} The first matching entity or null if not found.
   * @throws {ApplicationError} When the query operation fails.
   */
  public async findOne(
    query: Partial<TEntity>,
  ): Promise<MongoDocument<TEntity> | null> {
    this.logger.debug("Repository: Finding single entity", { query });
    try {
      const document = await this.collection.findOne(
        query as Filter<MongoDocument<TEntity>>,
      );
      if (document) {
        this.logger.debug("Repository: Single entity found", {
          id: document._id,
        });
      } else {
        this.logger.debug("Repository: Single entity not found");
      }
      return document as MongoDocument<TEntity> | null;
    } catch (error) {
      this.logger.error("Repository: FindOne operation failed", { error });
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed while finding a single entity.",
        cause: error as Error,
      });
    }
  }

  /**
   * Counts the total number of entities that match the specified query criteria.
   *
   * @param {TQuery} query - The query criteria for counting entities.
   * @returns {Promise<number>} The total count of matching entities.
   * @throws {ApplicationError} When the count operation fails.
   */
  public async count(query: Partial<TEntity>): Promise<number> {
    this.logger.debug("Repository: Counting entities", { query });
    try {
      const count = await this.collection.countDocuments(
        query as Filter<MongoDocument<TEntity>>,
      );
      this.logger.debug("Repository: Count operation successful", { count });
      return count;
    } catch (error) {
      this.logger.error("Repository: Count operation failed", { error });
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Database operation failed during entity count.",
        cause: error as Error,
      });
    }
  }

  /**
   * Creates necessary indexes for the collection.
   * @private
   */
  private async createIndexes(): Promise<void> {
    // Only create explicit unique indexes for configured fields.

    if (!this.uniqueFields) {
      return;
    }
    const indexes: IndexDescription[] = this.uniqueFields.map((config) => ({
      key: { [config]: 1 },
      unique: true,
      name: `idx_unique_${String(config)}`,
    }));

    if (indexes.length > 0) {
      try {
        await this.collection.createIndexes(indexes);
      } catch (error) {
        // Indexes may already exist (ok for idempotent init)
        // eslint-disable-next-line no-console
        console.warn(
          `Warning creating indexes for ${this.collectionName}:`,
          error,
        );
      }
    }
  }

  /**
   * Validates unique field constraints before database operations.
   *
   * @param {Partial<TEntity>} data - Data to validate
   * @param {ObjectId} [excludeId] - ID to exclude from uniqueness check (for updates)
   * @returns {Promise<boolean>} True if valid, false if constraint violation
   * @private
   */
  private async validateUniqueConstraints(
    data: Partial<TEntity>,
    excludeId?: ObjectId,
  ): Promise<boolean> {
    if (!this.uniqueFields) {
      return true;
    }

    try {
      for (const fieldName of this.uniqueFields) {
        const fieldValue = data[fieldName];
        if (fieldValue === undefined) {
          continue;
        }

        const query: any = { [fieldName]: fieldValue };
        if (excludeId) {
          query._id = { $ne: excludeId };
        }

        const existing = await this.collection.findOne(query);
        if (existing) {
          this.logger.warn("Unique constraint violation detected", {
            field: fieldName,
            value: fieldValue,
            existingId: existing._id,
            excludeId,
          });
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.error("Error validating unique constraints", {
        error: error instanceof Error ? error.message : "Unknown error",
        data,
        uniqueFields: this.uniqueFields,
      });
      throw new ApplicationError({
        type: ErrorType.DATABASE_ERROR,
        message: "Failed to validate unique constraints",
        statusCode: 500,
        metadata: {
          operation: "validateUniqueConstraints",
          data,
          uniqueFields: this.uniqueFields,
        },
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Extracts the field name from MongoDB duplicate key error message.
   *
   * @param {string} errorMessage - MongoDB error message
   * @returns {string} Field name that caused the duplicate error
   * @private
   */
  private extractDuplicateField(errorMessage: string): string {
    const match = errorMessage.match(/index:\s+([^\s]+)/);
    return match?.[1] ?? "unknown_field";
  }
}

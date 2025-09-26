import { ObjectId, MongoServerError } from "mongodb";
import type {
  DeleteResult,
  OptionalUnlessRequiredId,
  Db,
  CollectionInfo,
} from "mongodb";
import type { Collection, Document, Filter, MongoClient } from "mongodb";
import type { IndexDescription, FindOneAndUpdateOptions } from "mongodb";

import type { IRepository, Query } from "#root/domain/mongo.interface";
import type { MongoDocument } from "#root/domain/models/mongodocument";

/**
 * Configuration for unique fields in the repository
 */
export interface UniqueFieldConfig<T> {
  /** The field name that should be unique */
  fieldName: keyof T;
  /** Optional custom error message for duplicate violations */
  errorMessage?: string;
}

/**
 * A generic MongoDB repository implementation that handles CRUD operations.
 * @template T - The Domain Entity type
 * @implements {IRepository<T>}
 */
export class MongoDbRepository<T extends Document> implements IRepository<T> {
  protected readonly collection: Collection<MongoDocument<T>>;
  private readonly collectionName: string;
  private readonly uniqueFields: UniqueFieldConfig<T>[];
  #db: Db;

  /**
   * Creates a new MongoDB repository instance.
   * @param {MongoClient} mongoClient - The MongoDB client instance
   * @param {string} dbName - The name of the database to use
   * @param {string} collectionName - The name of the collection to use
   * @param {UniqueFieldConfig<T>[]} uniqueFields - Array of fields that should be unique
   */
  public constructor(
    mongoClient: MongoClient,
    dbName: string,
    collectionName: string,
    uniqueFields: UniqueFieldConfig<T>[] = [],
  ) {
    this.collectionName = collectionName;
    this.uniqueFields = uniqueFields;
    this.#db = mongoClient.db(dbName);
    this.collection = this.#db.collection<MongoDocument<T>>(collectionName);
  }

  /**
   * Initializes the repository collection and creates indexes if it doesn't exist.
   * @returns {Promise<boolean>} True if the collection was created, false if it already existed
   */
  public async initCollections(): Promise<boolean> {
    const collectionsList: CollectionInfo[] = await this.#db
      .listCollections({ name: this.collectionName })
      .toArray();

    const isNewCollection = collectionsList.length === 0;

    if (isNewCollection) {
      await this.#db.createCollection(this.collectionName);
    }

    await this.createIndexes();
    return isNewCollection;
  }

  /**
   * Creates necessary indexes for the collection.
   * @private
   */
  private async createIndexes(): Promise<void> {
    // Only create explicit unique indexes for configured fields.
    const indexes: IndexDescription[] = this.uniqueFields.map((config) => ({
      key: { [config.fieldName as string]: 1 },
      unique: true,
      name: `idx_unique_${String(config.fieldName)}`,
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
   * Validates that unique fields don't already exist in the database.
   * @private
   */
  private async validateUniqueDoc(
    data: Partial<T>,
    excludeId?: ObjectId,
  ): Promise<boolean> {
    for (const config of this.uniqueFields) {
      const fieldValue = data[config.fieldName];
      if (fieldValue !== undefined) {
        const base = { [config.fieldName as string]: fieldValue };

        const query = excludeId ? { ...base, _id: { $ne: excludeId } } : base;

        const existing = await this.collection.findOne(
          query as Filter<MongoDocument<T>>,
        );
        if (existing) return false;
      }
    }
    return true;
  }

  /**
   * Creates a new entity in the database.
   * NOTE: Signature matches IRepository<T>: expects a plain domain entity.
   * @param {T} data - The domain entity data to persist
   * @returns {Promise<T>} The created entity (domain-shape only)
   */
  public async create(data: T): Promise<MongoDocument<T> | null> {
    // Validate unique fields before creating
    const validationStatus: boolean = await this.validateUniqueDoc(
      data as Partial<T>,
    );

    if (!validationStatus) {
      return null;
    }

    // Build a full Mongo document with id and timestamp
    const document: MongoDocument<T> = {
      _id: new ObjectId(),
      createdAt: new Date(),
      ...data,
    };

    try {
      // insertOne accepts OptionalUnlessRequiredId<MongoDocument<T>>,
      // passing a fully built MongoDocument<T> is compatible.
      await this.collection.insertOne(
        document as OptionalUnlessRequiredId<MongoDocument<T>>,
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        const duplicateField = this.extractDuplicateField(error.message);
        throw new Error(
          `Duplicate value detected for field: ${duplicateField}`,
        );
      }
      throw error;
    }
    // Cast through unknown to satisfy TS when T could be a narrower subtype.
    return document;
  }

  /**
   * Extracts the duplicate field name from MongoDB error message.
   * @private
   */
  private extractDuplicateField(errorMessage: string): string {
    const match = errorMessage.match(/index:\s+([^\s]+)/);
    return match ? String(match[1]) : "unknown field";
  }

  /**
   * Retrieves an entity by its ID.
   * @param {string} id - The ID of the entity to retrieve
   * @returns {Promise<T | null>} The found entity or null if not found
   */
  public async read(
    id: string,
  ): Promise<MongoDocument<MongoDocument<T>> | null> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return null;
    }

    const document = await this.collection.findOne({ _id: objectId } as Filter<
      MongoDocument<T>
    >);
    if (!document) return null;
    return document as MongoDocument<T>;
  }

  /**
   * Updates an existing entity in the database.
   * @param {string} id - The ID of the entity to update
   * @param {Partial<T>} data - The partial data to update
   * @returns {Promise<T>} The updated entity (domain-shape only)
   */
  public async update(
    id: string | ObjectId,
    data: Partial<T>,
  ): Promise<MongoDocument<T> | null> {
    let objectId: ObjectId;
    try {
      objectId = typeof id === "string" ? new ObjectId(id) : id;
    } catch {
      return null;
    }

    const validationStatus: boolean = await this.validateUniqueDoc(
      data,
      objectId,
    );
    if (!validationStatus) return null;

    const filter = { _id: objectId } as Filter<MongoDocument<T>>;
    const updateDoc = { $set: data as Partial<MongoDocument<T>> };

    try {
      const options: FindOneAndUpdateOptions = { returnDocument: "after" };
      const result = await this.collection.findOneAndUpdate(
        filter,
        updateDoc,
        options,
      );

      if (!result) {
        return null;
      }
      return result as MongoDocument<T>;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        const duplicateField = this.extractDuplicateField(error.message);
        throw new Error(
          `Duplicate value detected for field: ${duplicateField}`,
        );
      }
      throw error;
    }
  }

  /**
   * Removes an entity from the database by its ID.
   * @param {string} id - The ID of the entity to remove
   * @returns {Promise<void>}
   */
  public async remove(id: string): Promise<DeleteResult> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }

    const filter = { _id: objectId } as Filter<MongoDocument<T>>;
    const result = await this.collection.deleteOne(filter);

    if (result.deletedCount === 0) {
      throw new Error(`Entity with id ${id} not found`);
    }
    return result;
  }

  /**
   * Finds multiple entities matching the given query.
   * @param {Query<T>} query - The query criteria
   * @returns {Promise<T[]>} An array of matching entities
   */
  public async find(query: Query<T>): Promise<MongoDocument<T>[]> {
    const mongoQuery = query as Filter<MongoDocument<T>>;
    const documents = await this.collection.find(mongoQuery).toArray();
    return documents as MongoDocument<T>[];
  }

  /**
   * Finds a single entity matching the given query.
   * @param {Query<T>} query - The query criteria
   * @returns {Promise<T | null>} The first matching entity or null if none found
   */
  public async findOne(query: Query<T>): Promise<MongoDocument<T> | null> {
    const mongoQuery = query as Filter<MongoDocument<T>>;
    const document = await this.collection.findOne(mongoQuery);
    if (!document) return null;
    // const { _id, createdAt, ...domainData } = document;
    return document as unknown as MongoDocument<T>;
  }

  /**
   * Finds an entity by a unique field value.
   * @param {keyof T} fieldName - The unique field name
   * @param {unknown} value - The value to search for
   * @returns {Promise<T | null>} The found entity or null if not found
   */
  public async findByUniqueField(
    fieldName: keyof T,
    value: unknown,
  ): Promise<MongoDocument<T> | null> {
    const query = { [fieldName]: value } as Query<T>;
    return this.findOne(query);
  }
}

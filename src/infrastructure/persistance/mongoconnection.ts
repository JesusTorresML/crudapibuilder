import { MongoClient } from "mongodb";
import type { MongoClientOptions } from "./types";
import type { Logger } from "../../domain/logger.interface.js";

import { localConfig } from "#root/config/local.js";

/**
 * @class MongoConnection
 * @description Manages a singleton connection to a MongoDB server.
 */
export class MongoConnection {
  private client: MongoClient | null = null;
  private mongoClientOptions: MongoClientOptions;
  /**
   *
   * @param {MongoClientOptions} mongoClientOptions - Local mongoclient options.
   * @param {Logger} logger - Logger instance
   */
  public constructor(
    mongoClientOptions: MongoClientOptions,
    private readonly logger: Logger,
  ) {
    this.mongoClientOptions = mongoClientOptions;
    // Commented line shutdown, will be handle with Main Orchestor.
    // this.registerForShutdown();
  }

  /**
   * Establishes a connection to the MongoDB server.
   * Throws an error if the connection fails.
   */
  public async connect(): Promise<void> {
    if (this.client) {
      return;
    }
    try {
      // Usar la configuración para la URI de la base de datos
      const uri = `mongodb://${this.mongoClientOptions.host}:${this.mongoClientOptions.port}`; // e.g., 'mongodb://localhost:27017'
      this.client = new MongoClient(uri, {
        zlibCompressionLevel:
          this.mongoClientOptions.compressionLevel ??
          localConfig.mongo.compressionLevel,
        compressors:
          this.mongoClientOptions.compresors ?? localConfig.mongo.compresors,
      });
      await this.client.connect();
      this.logger.debug("[MongoConnection] ✅ MongoDB connection established.");
    } catch (error) {
      this.logger.error(
        `[MongoConnection] ❌ Failed to connect to MongoDB, error: ${String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Returns the active MongoClient instance.
   * Throws an error if the connection has not been established.
   * @returns {MongoClient} The connected MongoClient instance.
   */
  public getClient(): MongoClient {
    if (!this.client) {
      throw new Error(
        "[MongoConnection] MongoDB client is not available. Call connect() first.",
      );
    }
    return this.client;
  }

  /**
   * Closes the connection to the MongoDB server.
   */
  public async disconnect(): Promise<void> {
    await this.client?.close();
    this.client = null;
    this.logger.debug("[MongoConnection] MongoDB connection closed.");
    process.exit(0);
  }

  /**
   * Sets up listeners for process termination signals (SIGINT, SIGTERM)
   * to ensure a graceful shutdown of the database connection.
   * This method registers the `disconnect` method to be called upon receiving a shutdown signal.
   * @private
   */
  private registerForShutdown(): void {
    this.logger.debug("Registering MongoDB connection for graceful shutdown.");
    process.on("SIGINT", () => this.disconnect());
    process.on("SIGTERM", () => this.disconnect());
  }
}

import express from "express";
import Helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import type { Router } from "express";
import type { ZodObject, ZodType } from "zod";

import { globalErrorHandler } from "./errorhandler.js";
import { ErrorType } from "#root/config/errors.js";
import { MongoDbRepository } from "../persistance/mongorepo.js";
import { CrudService } from "#root/application/services/crud.js";
import { CrudController } from "./controller.js";
import { MongoConnection } from "../persistance/mongoconnection.js";
import { WinstonLogger } from "../logger/winston.logger.js";
import type { AppConfig } from "#root/config/types.js";
import type { MongoDocument } from "#root/domain/index.js";
import { checkCorsOptions } from "./corsoptions.js";
import { createCrudRouter } from "./router.js";

/**
 * Options for creating an API Builder instance.
 */
export interface ApiBuilderOptions<T> {
  dbName: string;
  collection: string;
  schema: ZodObject<Record<string, ZodType>>;
  port?: number;
  uniqueFields?: (keyof T)[];
  mongoConnection?: {
    serverHost: string;
    serverPort: string;
  };
  apiConfig?: {
    allowedOrigins?: string[];
    rateLimitWindowMs?: number;
    rateLimitMaxRequests?: number;
  };
}

/**
 * Enhanced ApiBuilder that properly integrates the global error handler
 * and provides comprehensive middleware setup for production-ready APIs.
 *
 * @template TEntity - The domain entity type
 */
export class ApiBuilder<TEntity> {
  private readonly options: ApiBuilderOptions<TEntity>;
  private readonly mongoConnection: MongoConnection;
  private readonly logger: WinstonLogger;
  private readonly config: AppConfig;

  /**
   * Creates a new enhanced ApiBuilder instance with comprehensive configuration.
   *
   * @param {ApiBuilderOptions<TEntity>} options - Configuration options for the API builder
   * @param {AppConfig} [config] - Application configuration object
   */
  public constructor(options: ApiBuilderOptions<TEntity>, config?: AppConfig) {
    this.options = options;
    // Priority: provided config > options inline > default config file
    if (config) {
      this.config = config;
    } else {
      // Use inline options or fallback to local.json
      this.config = this.buildConfigFromOptions(options);
    }
    this.logger = new WinstonLogger();

    this.mongoConnection = new MongoConnection(
      {
        serverHost: this.config.database.serverHost,
        serverPort: this.config.database.serverPort,
      },
      this.logger,
    );

    this.registerForShutdown();
  }

  /**
   * Builds and returns an Express Router with proper error handling middleware.
   * The router includes validation middleware and delegates errors to global handler.
   *
   * @returns {Promise<Router>} Configured Express router with error handling
   */
  public async buildRouter(): Promise<Router> {
    const service = await this.initializeService();
    const controller = new CrudController<TEntity>(service, this.logger);

    const router = createCrudRouter(controller, this.options.schema);
    return router;
  }

  /**
   * Builds and runs a standalone Express server with comprehensive middleware setup
   * including the global error handler as the final middleware.
   *
   * @returns {Promise<Express>} Configured Express application
   */
  public async buildServer(): Promise<Express> {
    const router = await this.buildRouter();
    const app = express();

    // Apply basic middleware
    this.setupBasicMiddleware(app);

    // Apply security middleware
    this.setupSecurityMiddleware(app);
    // Mount entity router
    app.use(this.requestLoggerMiddleware.bind(this)); // Custom request logger
    app.use(`/${this.options.collection}`, router);

    app.use((_req: Request, _res: Response, next: NextFunction) => {
      next({ message: "Route not found", statusCode: 404 });
    });

    // CRITICAL: Global error handler MUST be the last middleware
    app.use(globalErrorHandler);

    // Start server
    const port = this.options.port || this.config.apiServerConfig.port;

    return new Promise((resolve, reject) => {
      try {
        const server = app.listen(port, () => {
          this.logger.info(
            `🚀 ApiBuilder server running on http://localhost:${port}`,
          );
          resolve(app);
        });

        server.on("error", (error) => {
          this.logger.error("Server startup failed", { error: error.message });
          reject(error);
        });
      } catch (error) {
        this.logger.error("Failed to start server", { error });
        reject(error);
      }
    });
  }

  /**
   * Sets up basic Express middleware including body parsing and CORS.
   *
   * @param {Express} app - Express application instance
   * @private
   */
  private setupBasicMiddleware(app: Express): void {
    // Body parsing middleware
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(cookieParser());

    // CORS configuration
    app.use(cors(checkCorsOptions(this.config.apiServerConfig.allowedOrigins)));

    // Security headers
    app.disable("x-powered-by");
    app.use(Helmet());

    // Request timeout
    // app.use(timeout(this.config.server.requestTimeout));
  }

  /**
   * Sets up security middleware including rate limiting and authentication.
   *
   * @param {Express} app - Express application instance
   * @private
   */
  private setupSecurityMiddleware(app: Express): void {
    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.apiServerConfig.rateLimitWindowMs,
      max: this.config.apiServerConfig.rateLimitMaxRequests,
      message: {
        success: false,
        error: {
          type: ErrorType.SERVER_ERROR,
          message: "Too many requests, please try again later",
          timestamp: new Date(),
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use(limiter);

    // Request size limits
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  }

  /**
   * A middleware that logs details about each incoming HTTP request.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @param {NextFunction} next - The next function to call in case of an error.
   * @private
   */
  private requestLoggerMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const start = process.hrtime();

    res.on("finish", () => {
      const diff = process.hrtime(start);
      const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3); // duration in ms
      const { method, originalUrl } = req;
      const { statusCode } = res;
      this.logger.info(
        `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
      );
    });

    next();
  }

  /**
   * Initializes the service layer with proper dependency injection.
   * @returns {Promise<CrudService<TEntity>>} Configured service instance
   * @private
   */
  private async initializeService(): Promise<CrudService<TEntity>> {
    await this.mongoConnection.connect();
    const mongoClient = this.mongoConnection.getClient();

    const repository = new MongoDbRepository<MongoDocument<TEntity>>(
      mongoClient,
      this.options.dbName,
      this.options.collection,
      this.options.uniqueFields,
      this.logger,
    );

    await repository.initCollections();
    return new CrudService<TEntity>(repository, this.logger);
  }

  /**
   * Registers process signal handlers for graceful shutdown.
   * @private
   */
  private registerForShutdown(): void {
    this.logger.debug("Registering shutdown handlers");

    /**
     * Handles graceful shutdown on process termination signals.
     * @param {string} signal - The termination signal received (SIGINT, SIGTERM, etc.)
     * @returns {Promise<void>} Resolves when shutdown is complete
     */
    const shutdown = async (signal: string): Promise<void> => {
      this.logger.info(`Received ${signal}, shutting down gracefully`);
      await this.mongoConnection.disconnect();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }

  /**
   * Build configuration object
   * @param {ApiBuilderOptions<TEntity>} options - Configuration options
   */
  private buildConfigFromOptions(
    options: ApiBuilderOptions<TEntity>,
  ): AppConfig {
    // Build config from inline options with defaults
    return {
      database: {
        serverHost: options.mongoConnection?.serverHost || "localhost",
        serverPort: options.mongoConnection?.serverPort || "27017",
        compressionLevel: 6,
        compresors: ["snappy"],
      },
      apiServerConfig: {
        hostname: "localhost",
        port: String(options.port || 3000),
        allowedOrigins: options.apiConfig?.allowedOrigins || [
          "http://localhost:3000",
        ],
        rateLimitWindowMs: options.apiConfig?.rateLimitWindowMs || 900000,
        rateLimitMaxRequests: options.apiConfig?.rateLimitMaxRequests || 100,
      },
    };
  }
}

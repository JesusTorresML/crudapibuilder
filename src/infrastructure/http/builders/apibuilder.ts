import cors from "cors";
import express from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import Helmet from "helmet";
import type { MongoClient } from "mongodb";
import type { Router } from "express";
import type { Express, Request, Response, NextFunction } from "express";

import { CrudService } from "#application/services/crud.js";
import { CrudController, createCrudRouter } from "../routing/index.js";
import { globalErrorHandler } from "../middlewares/errorhandler.js";
import { MongoDbRepository, MongoConnection } from "../../persistance/index.js";
import { WinstonLogger } from "../../logger/winston.logger.js";
import { checkCorsOptions } from "../security/corsoptions.js";
import { createSwaggerMiddleware } from "../swagger/middleware.js";
import { ErrorType, RouteError } from "#config/errors.js";

import type { ApiBuilderOptions } from "./types.js";
import type { AppConfig } from "#config/types.js";
import type { MongoDocument } from "#domain/index.js";
import { localConfig } from "#config/local.js";

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
  private readonly app: Express;

  /**
   * Creates a new enhanced ApiBuilder instance with comprehensive configuration.
   *
   * @param {ApiBuilderOptions<TEntity>} options - Configuration options for the API builder
   */
  public constructor(options: ApiBuilderOptions<TEntity>) {
    this.options = options;
    this.app = express();

    this.config = this.buildConfigFromOptions(options);
    this.logger = new WinstonLogger();

    this.mongoConnection = new MongoConnection(this.config.mongo, this.logger);

    this.registerForShutdown();
  }

  /**
   * Builds and returns an Express Router with proper error handling middleware.
   * The router includes validation middleware and delegates errors to global handler.
   *
   * @returns {Promise<Router>} Configured Express router with error handling
   */
  public async buildRouter(): Promise<Router> {
    const service: CrudService<TEntity> = await this.initializeService();
    const controller: CrudController<TEntity> = new CrudController<TEntity>(
      service,
      this.logger,
    );

    const router: Router = createCrudRouter(controller, this.options.schema);
    return router;
  }

  /**
   * Builds and runs a standalone Express server with comprehensive middleware setup
   * including the global error handler as the final middleware.
   *
   * @returns {Promise<Express>} Configured Express application
   */
  public async buildServer(): Promise<Express> {
    // Apply basic middleware
    this.setupBasicMiddleware();

    // Apply security middleware
    this.setupSecurityMiddleware();

    // Mount entity router
    this.app.use(this.requestLoggerMiddleware.bind(this)); // Custom request logger

    const router = await this.buildRouter();
    this.app.use(`/api/v1/${this.options.database.collection}`, router);

    this.app.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({ status: "ok" });
    });

    this.app.use((req: Request, _res: Response, _next: NextFunction) => {
      throw new RouteError({
        message: "Route not found",
        route: "/api/v1/" + req.path,
        method: req.method,
      });
    });

    // CRITICAL: Global error handler MUST be the last middleware
    this.app.use(globalErrorHandler);

    // Start server
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.options.apiPort, () => {
          this.logger.info(
            `🚀 ApiBuilder server running on http://localhost:${this.options.apiPort}`,
          );
          resolve(this.app);
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
   * @private
   */
  private setupBasicMiddleware(): void {
    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(cookieParser());

    // CORS configuration
    this.app.use(cors(checkCorsOptions(this.config.server.allowedOrigins)));

    // Security headers
    this.app.disable("x-powered-by");
    this.app.use(Helmet());

    const swaggerEnabled = this.options.swagger?.enabled !== false;

    if (swaggerEnabled) {
      const swaggerPath: string = this.options.swagger?.path || "/docs";
      const serverUrl: string = `http://localhost:${this.options.apiPort || 5000}`;
      console.log("ServerUrl", serverUrl);
      const swaggerRouter = createSwaggerMiddleware({
        title:
          this.options.swagger?.title ||
          `${this.options.database.collection} API`,
        description:
          this.options.swagger?.description ||
          `CRUD API for ${this.options.database.collection} - Auto-generated with Zod validation`,
        version: this.options.swagger?.version || "1.0.0",
        path: swaggerPath,
        resourceName: this.options.database.collection,
        basePath: `/api/v1/${this.options.database.collection}`,
        serverUrl: `http://localhost:${this.options.apiPort || 5000}`,
        schema: this.options.schema,
        uniqueFields: this.options.uniqueFields as
          | (string | number)[]
          | undefined,
      });
      this.logger.info(
        `  📚 Swagger docs available at http://localhost:${this.options.apiPort}${swaggerPath}`,
      );
      this.app.use(swaggerRouter);
    }

    // Request timeout
    // app.use(timeout(this.config.server.requestTimeout));
  }

  /**
   * Sets up security middleware including rate limiting and authentication.
   * @private
   */
  private setupSecurityMiddleware(): void {
    // Rate limiting
    const limiter: RateLimitRequestHandler = rateLimit({
      windowMs: this.config.server.rateLimitWindowMs,
      max: this.config.server.rateLimitMaxRequests,
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

    this.app.use(limiter);

    // Request size limits
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
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
    const mongoClient: MongoClient = this.mongoConnection.getClient();

    const repository = new MongoDbRepository<MongoDocument<TEntity>>(
      mongoClient,
      this.options.database.name,
      this.options.database.collection,
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
   * @returns {AppConfig} - Application config.
   */
  private buildConfigFromOptions(
    options: ApiBuilderOptions<TEntity>,
  ): AppConfig {
    return {
      database: options.database,

      mongo: {
        host: options.mongoConfig?.host ?? localConfig.mongo.host,
        port: options.mongoConfig?.port ?? localConfig.mongo.port,
        compressionLevel:
          options.mongoConfig?.compressionLevel ??
          localConfig.mongo.compressionLevel,
        compresors:
          options.mongoConfig?.compresors ?? localConfig.mongo.compresors,
      },

      server: {
        hostname: localConfig.server.hostname,
        port: options.apiPort,
        allowedOrigins:
          options.serverConfig?.allowedOrigins ??
          localConfig.server.allowedOrigins,
        rateLimitWindowMs:
          options.serverConfig?.rateLimitWindowMs ??
          localConfig.server.rateLimitWindowMs,
        rateLimitMaxRequests:
          options.serverConfig?.rateLimitMaxRequests ??
          localConfig.server.rateLimitMaxRequests,
      },
    };
  }
}

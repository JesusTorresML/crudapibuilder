import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { checkCorsOptions } from "./corsoptions.js";
import bodyParser from "body-parser";
import type { MongoClient } from "mongodb";
import type { ZodObject } from "zod";
import type { Express, Router, Request, Response, NextFunction } from "express";

import { MongoDbRepository } from "../persistance/mongorepo.js";
import { CrudService } from "#root/application/services/crud.js";
import { createCrudRouter } from "./router.js";
import type { MongoDocument } from "#root/domain/models/mongodocument.js";
import { CrudController } from "./controller.js";
import type { MongoClientOptions } from "../persistance/types.js";
import { localConfig } from "#root/config/local.js";
import { MongoConnection } from "../persistance/mongoconnection.js";
import { WinstonLogger } from "../logger/winston.logger.js";
import { CustomError } from "../tools/errors.js";

/**
 * Options for creating an API Builder instance.
 */
export interface ApiBuilderOptions<T> {
  mongoClientOptions: MongoClientOptions;
  dbName: string;
  collection: string;
  schema: ZodObject<any>;
  port?: number;
  uniqueFields?: (keyof T)[];
}

/**
 * ApiBuilder provides two modes of use:
 * 1. Create only a Router to be mounted into an existing Express app.
 * 2. Create and run a complete standalone Express server.
 */
export class ApiBuilder<T> {
  private readonly options: ApiBuilderOptions<T>;
  private readonly mongoConnection: MongoConnection;
  logger: WinstonLogger;
  /**
   *
   * @param options
   */
  constructor(options: ApiBuilderOptions<T>) {
    this.options = options;
    this.logger = new WinstonLogger();

    this.mongoConnection = new MongoConnection(
      options.mongoClientOptions,
      this.logger,
    );

    this.registerForShutdown();
  }

  /**
   * Connects to MongoDB and prepares the repository + service.
   */
  private async init(): Promise<CrudService<T>> {
    await this.mongoConnection.connect();
    const mongoClient: MongoClient = this.mongoConnection.getClient();

    const repo = new MongoDbRepository<MongoDocument<T>>(
      mongoClient,
      this.options.dbName,
      this.options.collection,
      this.options.uniqueFields,
      this.logger,
    );
    await repo.initCollections();
    return new CrudService<T>(repo);
  }

  /**
   * Builds and returns an Express Router for the given entity.
   * This allows integration into an existing Express server.
   */
  public async buildRouter(): Promise<Router> {
    const service = await this.init();
    const controller: CrudController<T> = new CrudController<T>(service);
    return createCrudRouter<T>(controller, this.options.schema);
  }

  /**
   * Builds and runs a standalone Express server.
   * Useful for quick setup with no boilerplate.
   */
  public async buildServer(): Promise<Express> {
    const router: Router = await this.buildRouter();

    const app: Express = express();
    app.use(bodyParser.json());
    app.use(express.json()); // For parsing application/json
    app.use(express.urlencoded({ extended: false })); // For parsing application/x-www-form-urlencoded
    app.use(cookieParser()); // For parsing cookies
    app.disable("x-powered-by"); // A small security enhancement
    app.use(this.requestLoggerMiddleware.bind(this)); // Custom request logger
    app.use(cors(checkCorsOptions(localConfig.apiServerConfig.allowedOrigins)));

    app.use(`/${this.options.collection}`, router);

    // after mounting all routers
    app.use((_req: Request, _res: Response, next: NextFunction) => {
      next({ message: "Route not found", statusCode: 404 });
    });

    // error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.statusCode ?? 500;
      res.status(status).json({
        success: false,
        message: err.message ?? "Internal Server Error",
      });
    });

    const port = this.options.port;
    try {
      app.listen(port, () =>
        console.log(`🚀 ApiBuilder server running on http://localhost:${port}`),
      );
    } catch (error) {
      throw new CustomError({
        name: "SERVER_ERROR",
        cause: "cant start server",
        message: String(error),
      });
    }

    return app;
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
   *
   */
  private registerForShutdown(): void {
    this.logger.debug("Registering MongoDB connection for graceful shutdown.");
    process.on("SIGINT", () => this.mongoConnection.disconnect());
    process.on("SIGTERM", () => this.mongoConnection.disconnect());
  }
}

import express from "express";
import Helmet from "helmet";
import type { RateLimitRequestHandler } from "express-rate-limit";
import rateLimit from "express-rate-limit";
import cors from "cors";
import cookieParser from "cookie-parser";
import type { Express, Request, Response, NextFunction } from "express";

import { globalErrorHandler } from "../middlewares/errorhandler.js";
import { createSwaggerMiddleware } from "../swagger/middleware.js";
import { WinstonLogger } from "../../logger/winston.logger.js";
import { checkCorsOptions } from "../security/corsoptions.js";

import { ErrorType, RouteError } from "#config/errors.js";
import type { ServerFactoryOptions, RouterConfig } from "./types.js";
import type { ApiServerConfig } from "#config/types.js";

/**
 * Factory class for creating an Express server with multiple routers
 * and comprehensive middleware setup.
 */
export class ServerFactory {
  private readonly logger: WinstonLogger;
  private readonly config: ApiServerConfig;
  private readonly port: number;
  private readonly apiVersion: string;
  private readonly enableSwagger: boolean;
  private readonly swaggerPath: string;
  private readonly app: Express;

  /**
   * Build API REST Server
   * @param {ServerFactoryOptions} options - Server factory options
   */
  public constructor(options: ServerFactoryOptions = {}) {
    this.app = express();
    this.logger = new WinstonLogger();
    this.port = options.port || Number(options.config?.port) || 5000;
    this.config = options.config || this.getDefaultConfig();
    this.apiVersion = options.apiVersion || "v1";
    this.enableSwagger = options.enableSwagger !== false;
    this.swaggerPath = options.swaggerPath || "/docs";
  }

  /**
   * Creates and configures an Express server with multiple routers
   *
   * @param {RouterConfig[]} routers - Array of router configurations
   * @returns  {Express} - Configured Express application
   */
  public async createServer(routers: RouterConfig[]): Promise<Express> {
    // Apply basic middleware
    this.setupBasicMiddleware();

    // Apply security middleware
    this.setupSecurityMiddleware();

    // Request logger
    this.app.use(this.requestLoggerMiddleware.bind(this));

    // Mount all routers
    this.mountRouters(routers);

    // Health check endpoint
    this.app.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: this.apiVersion,
      });
    });

    this.app.use(
      "/api/v1",
      (_req: Request, res: Response, _next: NextFunction) => {
        res.json({
          message: "Welcome to your API",
        });
      },
    );

    this.app.get("/", (_req: Request, res: Response, _next: NextFunction) => {
      res.json({
        message: "Welcome to your API",
      });
    });

    // 404 handler
    this.app.use((req: Request, _res: Response, _next: NextFunction) => {
      throw new RouteError({
        message: "Route not found",
        route: req.path,
        method: req.method,
      });
    });

    // Global error handler MUST be last
    this.app.use(globalErrorHandler);

    // Start server
    return this.startServer();
  }

  /**
   * Mounts all routers with their respective paths and Swagger documentation
   * @param {RouterConfig[]} routers - Routers Config
   * @returns {void} - Void
   */
  private mountRouters(routers: RouterConfig[]): void {
    for (const routerConfig of routers) {
      const fullPath = `/api/${this.apiVersion}${routerConfig.path}`;
      // Mount the router
      this.app.use(fullPath, routerConfig.router);
      this.logger.info(`  ✓ Routes mounted at ${fullPath}`);

      // Setup Swagger for this router if enabled
      if (this.enableSwagger && routerConfig.swagger?.enabled !== false) {
        this.setupRouterSwagger(routerConfig);
      }
    }
  }

  /**
   * Sets up Swagger documentation for a specific router
   * @param {RouterConfig} routerConfig - Router configuration.
   */
  private setupRouterSwagger(routerConfig: RouterConfig): void {
    const swagger = routerConfig.swagger;
    if (!swagger?.schema) {
      this.logger.warn(
        `Swagger enabled but no schema provided for ${routerConfig.path}`,
      );
      return;
    }

    const resourceName =
      swagger.resourceName || routerConfig.path.replace(/^\//, "");
    const swaggerPath = `${this.swaggerPath}${routerConfig.path}`;

    const swaggerRouter = createSwaggerMiddleware({
      title: swagger.title || `${resourceName} API`,
      description: swagger.description || `CRUD API for ${resourceName}`,
      version: swagger.version || "1.0.0",
      path: swaggerPath,
      resourceName,
      basePath: `/api/${this.apiVersion}${routerConfig.path}`,
      serverUrl: `http://localhost:${this.port}`,
      schema: swagger.schema,
      uniqueFields: swagger.uniqueFields,
    });

    this.app.use(swaggerRouter);
    this.logger.info(
      `  📚 Swagger docs available at http://localhost:${this.port}${swaggerPath}`,
    );
  }

  /**
   * Sets up basic Express middleware
   */
  private setupBasicMiddleware(): void {
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(cookieParser());
    this.app.use(cors(checkCorsOptions(this.config.allowedOrigins)));
    this.app.disable("x-powered-by");
    this.app.use(Helmet());
  }

  /**
   * Sets up security middleware including rate limiting
   */
  private setupSecurityMiddleware(): void {
    const limiter: RateLimitRequestHandler = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMaxRequests,
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
  }

  /**
   * Request logger middleware
   * @param {Request} req - Express request object containing entity ID
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function for error handling
   */
  private requestLoggerMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const start = process.hrtime();

    res.on("finish", () => {
      const diff = process.hrtime(start);
      const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
      const { method, originalUrl } = req;
      const { statusCode } = res;
      this.logger.info(
        `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
      );
    });

    next();
  }

  /**
   * Starts the Express server
   * @returns {Promise<Express>} - Express
   */
  private async startServer(): Promise<Express> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.port, () => {
          this.logger.info(
            `🚀 Server running on http://localhost:${this.port}`,
          );
          this.logger.info(
            `📍 API base: http://localhost:${this.port}/api/${this.apiVersion}`,
          );
          resolve(this.app);
        });

        server.on("error", (error) => {
          this.logger.error("Server startup failed", {
            error: (error as Error).message,
          });
          reject(error);
        });
      } catch (error) {
        this.logger.error("Failed to start server", { error });
        reject(error);
      }
    });
  }

  /**
   * Gets default configuration
   * @returns {AppConfig} - Application Config.
   */
  private getDefaultConfig(): ApiServerConfig {
    return {
      hostname: "localhost",
      port: this.port,
      allowedOrigins: [`http://localhost:${this.port}`, "http://localhost"],
      rateLimitWindowMs: this.config?.rateLimitWindowMs ?? 15000,
      rateLimitMaxRequests: this.config?.rateLimitMaxRequests ?? 10,
    };
  }
}

/**
 * Helper function to create a server with multiple routers
 * Simplified API for quick setup
 * @param {RouterConfig[]} routers - Routers configuration.
 * @param {ServerFactoryOptions} options - Server options.
 * @returns {Promise<Express>} - Start express server.
 */
export async function createMultiRouterServer(
  routers: RouterConfig[],
  options?: ServerFactoryOptions,
): Promise<Express> {
  const factory: ServerFactory = new ServerFactory(options);
  return await factory.createServer(routers);
}

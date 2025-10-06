import type { Router } from "express";

import type { ZodObject, ZodType } from "zod";
import type {
  ApiServerConfig,
  DatabaseConfig,
  MongoConfig,
} from "#config/index.js";

/**
 * Options for creating an API Builder instance.
 */
export interface ApiBuilderOptions<T> {
  // Api port
  apiPort: number;

  // Database Config;
  database: DatabaseConfig;

  // Schema config.
  schema: ZodObject<Record<string, ZodType>>;
  // Ensure unique field in database.
  uniqueFields?: (keyof T)[];

  // Server Config
  serverConfig?: ApiServerConfig;

  // Database Config
  mongoConfig?: MongoConfig;

  // Swagger Docs
  swagger?: {
    enabled?: boolean;
    title?: string;
    description?: string;
    version?: string;
    path?: string;
  };
}

/**
 * Configuration for a single router with its Swagger documentation
 */
export interface RouterConfig {
  router: Router;
  path: string;
  swagger?: {
    enabled?: boolean;
    title?: string;
    description?: string;
    version?: string;
    schema?: ZodObject<Record<string, ZodType>>;
    uniqueFields?: (string | number)[];
    resourceName?: string;
  };
}

/**
 * Options for creating the API server
 */
export interface ServerFactoryOptions {
  port?: number;
  config?: ApiServerConfig;
  apiVersion?: string;
  enableSwagger?: boolean;
  swaggerPath?: string;
}

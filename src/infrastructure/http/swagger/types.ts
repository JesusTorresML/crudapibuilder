import type { ZodObject, ZodType } from "zod";
import type { SwaggerUiOptions } from "swagger-ui-express";
/**
 * OpenAPI Schema Object type
 */
export type OpenAPISchemaObject = {
  type?: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  enum?: readonly unknown[];
  items?: OpenAPISchemaObject;
  properties?: Record<string, OpenAPISchemaObject>;
  required?: string[];
  nullable?: boolean;
  default?: unknown;
  description?: string;
  example?: unknown;
};

/**
 * Swagger UI middleware configuration
 */
export type SwaggerMiddlewareConfig = {
  title: string;
  description?: string;
  version?: string;
  path?: string;
  basePath: string;
  resourceName: string;
  serverUrl: string;
  schema: ZodObject<Record<string, ZodType>>;
  uniqueFields?: (string | number)[];
  // Opciones adicionales de swagger-ui-express
  swaggerUiOptions?: SwaggerUiOptions;
  customCss?: string;
  customSiteTitle?: string;
};

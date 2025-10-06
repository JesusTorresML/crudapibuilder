import type { ZodObject, ZodType } from "zod";
import { z } from "zod";
import type swaggerJsdoc from "swagger-jsdoc";
import type { OpenAPISchemaObject } from "./types.js";

/**
 * Converts a Zod schema to OpenAPI/Swagger schema
 */
export class ZodToSwagger {
  /**
   * Convert Zod schema to Swagger schema object
   * @param {z.ZodTypeAny} schema - Zod schema to convert
   * @returns {OpenAPISchemaObject} OpenAPI schema object
   */
  public static convertSchema(schema: z.ZodTypeAny): OpenAPISchemaObject {
    if (schema instanceof z.ZodString) {
      const stringSchema: OpenAPISchemaObject = { type: "string" };

      const checks =
        (schema as { _def: { checks?: unknown[] } })._def.checks || [];
      for (const check of checks) {
        const typedCheck = check as {
          kind: string;
          value?: number;
          regex?: { source: string };
        };

        if (typedCheck.kind === "min" && typedCheck.value !== undefined) {
          stringSchema.minLength = typedCheck.value;
        }
        if (typedCheck.kind === "max" && typedCheck.value !== undefined) {
          stringSchema.maxLength = typedCheck.value;
        }
        if (typedCheck.kind === "email") stringSchema.format = "email";
        if (typedCheck.kind === "url") stringSchema.format = "uri";
        if (typedCheck.kind === "uuid") stringSchema.format = "uuid";
        if (typedCheck.kind === "regex" && typedCheck.regex) {
          stringSchema.pattern = typedCheck.regex.source;
        }
      }

      return stringSchema;
    }

    if (schema instanceof z.ZodNumber) {
      const numberSchema: OpenAPISchemaObject = { type: "number" };

      const checks =
        (schema as { _def: { checks?: unknown[] } })._def.checks || [];
      for (const check of checks) {
        const typedCheck = check as {
          kind: string;
          value?: number;
          inclusive?: boolean;
        };

        if (typedCheck.kind === "min" && typedCheck.value !== undefined) {
          numberSchema.minimum = typedCheck.value;
          if (typedCheck.inclusive === false) {
            numberSchema.exclusiveMinimum = true;
          }
        }
        if (typedCheck.kind === "max" && typedCheck.value !== undefined) {
          numberSchema.maximum = typedCheck.value;
          if (typedCheck.inclusive === false) {
            numberSchema.exclusiveMaximum = true;
          }
        }
        if (typedCheck.kind === "int") numberSchema.type = "integer";
      }

      return numberSchema;
    }

    if (schema instanceof z.ZodBoolean) {
      return { type: "boolean" };
    }

    if (schema instanceof z.ZodDate) {
      return { type: "string", format: "date-time" };
    }

    if (schema instanceof z.ZodEnum) {
      const values = (schema as { _def: { values: readonly unknown[] } })._def
        .values;
      return {
        type: "string",
        enum: values,
      };
    }

    if (schema instanceof z.ZodArray) {
      const itemSchema = (schema as { _def: { type: z.ZodTypeAny } })._def.type;
      return {
        type: "array",
        items: this.convertSchema(itemSchema),
      };
    }

    if (schema instanceof z.ZodObject) {
      const shape = (
        schema as { _def: { shape: () => Record<string, z.ZodTypeAny> } }
      )._def.shape() as Record<string, z.ZodTypeAny>;
      const properties: Record<string, OpenAPISchemaObject> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const zodSchema = value as z.ZodTypeAny;
        properties[key] = this.convertSchema(zodSchema);

        // Add description from Zod description if available

        const description = (zodSchema as { _def?: { description?: string } })
          ._def?.description;
        if (description) {
          properties[key].description = description;
        }

        // Check if field is optional
        if (!(zodSchema instanceof z.ZodOptional)) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        ...(required.length > 0 && { required }),
      };
    }

    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
      const innerSchema = (schema as { _def: { innerType: z.ZodTypeAny } })._def
        .innerType;
      const converted = this.convertSchema(innerSchema);
      return { ...converted, nullable: schema instanceof z.ZodNullable };
    }

    if (schema instanceof z.ZodDefault) {
      const innerSchema = (schema as { _def: { innerType: z.ZodTypeAny } })._def
        .innerType;

      const defaultValue = (
        schema as { _def: { defaultValue: () => unknown } }
      )._def.defaultValue() as unknown;
      const converted = this.convertSchema(innerSchema);
      return { ...converted, default: defaultValue };
    }

    // Fallback for unsupported types
    return { type: "object" };
  }

  /**
   * Generate example data from schema
   * @param {z.ZodTypeAny} schema - Zod schema to generate example from
   * @returns {unknown} Example data
   */
  public static generateExample(schema: z.ZodTypeAny): unknown {
    if (schema instanceof z.ZodString) return "example-string";
    if (schema instanceof z.ZodNumber) return 1;
    if (schema instanceof z.ZodBoolean) return true;
    if (schema instanceof z.ZodDate) return new Date().toISOString();
    if (schema instanceof z.ZodEnum) {
      return (schema as { _def: { values: readonly unknown[] } })._def
        .values[0];
    }
    if (schema instanceof z.ZodArray) {
      const itemSchema = (schema as { _def: { type: z.ZodTypeAny } })._def.type;
      return [this.generateExample(itemSchema)];
    }

    if (schema instanceof z.ZodObject) {
      const shape = (
        schema as { _def: { shape: () => Record<string, z.ZodTypeAny> } }
      )._def.shape() as Record<string, z.ZodTypeAny>;
      const example: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as z.ZodTypeAny;

        // Check if it has a default value
        if (zodValue instanceof z.ZodDefault) {
          example[key] = (
            zodValue as { _def: { defaultValue: () => unknown } }
          )._def.defaultValue() as unknown;
        } else {
          example[key] = this.generateExample(zodValue);
        }
      }

      return example;
    }

    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
      const innerSchema = (schema as { _def: { innerType: z.ZodTypeAny } })._def
        .innerType;
      return this.generateExample(innerSchema);
    }

    if (schema instanceof z.ZodDefault) {
      return (
        schema as { _def: { defaultValue: () => unknown } }
      )._def.defaultValue();
    }

    return null;
  }
}

/**
 * Configuration for Swagger generation
 */
export interface SwaggerConfig<T> {
  title: string;
  description?: string;
  version?: string;
  basePath: string;
  resourceName: string;
  serverUrl: string;
  schema: ZodObject<Record<string, ZodType>>;
  uniqueFields?: (keyof T)[];
}

/**
 * Generates swagger-jsdoc options for CRUD API
 */
export class SwaggerGenerator<T> {
  private readonly config: SwaggerConfig<T>;
  private readonly swaggerSchema: OpenAPISchemaObject;
  private readonly example: unknown;

  /**
   * Creates a new SwaggerGenerator instance
   * @param {SwaggerConfig<T>} config - Configuration for Swagger generation
   */
  public constructor(config: SwaggerConfig<T>) {
    this.config = config;
    this.swaggerSchema = ZodToSwagger.convertSchema(config.schema);
    this.example = ZodToSwagger.generateExample(config.schema);
  }

  /**
   * Generate swagger-jsdoc options
   * @returns {swaggerJsdoc.Options} Swagger JSDoc options
   */
  public generateSwaggerOptions(): swaggerJsdoc.Options {
    const capitalizedName =
      this.config.resourceName.charAt(0).toUpperCase() +
      this.config.resourceName.slice(1);

    return {
      definition: {
        openapi: "3.0.0",
        info: {
          title: this.config.title,
          version: this.config.version || "1.0.0",
          description:
            this.config.description ||
            `CRUD API for ${this.config.resourceName}`,
          contact: {
            name: "API Support",
          },
        },
        servers: [
          {
            url: this.config.serverUrl,
            description: "API Server",
          },
        ],
        tags: [
          {
            name: capitalizedName,
            description: `${capitalizedName} operations`,
          },
        ],
        components: {
          schemas: this.generateSchemas(),
          responses: this.generateResponses(),
        },
        paths: this.generatePaths(),
      },
      apis: [], // No necesitamos archivos porque generamos todo programáticamente
    };
  }

  /**
   * Generate component schemas
   * @returns {Record<string, OpenAPISchemaObject>} Component schemas
   */
  private generateSchemas(): Record<string, OpenAPISchemaObject> {
    const capitalizedName =
      this.config.resourceName.charAt(0).toUpperCase() +
      this.config.resourceName.slice(1);

    return {
      [capitalizedName]: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "MongoDB ObjectId",
            example: "507f1f77bcf86cd799439011",
          },
          ...this.swaggerSchema.properties,
        },
        required: ["_id", ...(this.swaggerSchema.required || [])],
      },
      [`${capitalizedName}Create`]: {
        type: "object",
        properties: this.swaggerSchema.properties,
        required: this.swaggerSchema.required || [],
        example: this.example,
      },
      [`${capitalizedName}Update`]: {
        type: "object",
        properties: this.swaggerSchema.properties,
        description: "All fields are optional for updates",
      },
      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "VALIDATION_ERROR",
                  "NOT_FOUND_ERROR",
                  "DUPLICATE_ERROR",
                  "DATABASE_ERROR",
                  "SERVER_ERROR",
                ],
              },
              message: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
              details: { type: "object" },
            },
          },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            type: "object",
          },
        },
      },
      ListResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            type: "array",
            items: { type: "object" },
          },
          count: {
            type: "integer",
            example: 10,
          },
        },
      },
    };
  }

  /**
   * Generate reusable responses
   * @returns {Record<string, unknown>} Response definitions
   */
  private generateResponses(): Record<string, unknown> {
    return {
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              success: false,
              error: {
                type: "VALIDATION_ERROR",
                message: "Request validation failed",
                timestamp: new Date().toISOString(),
                details: {
                  field: "price",
                  violations: ["price must be a positive number"],
                },
              },
            },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              success: false,
              error: {
                type: "NOT_FOUND_ERROR",
                message: "Entity not found",
                timestamp: new Date().toISOString(),
              },
            },
          },
        },
      },
      DuplicateError: {
        description: "Duplicate entry",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              success: false,
              error: {
                type: "DUPLICATE_ERROR",
                message: this.config.uniqueFields
                  ? `Duplicate value for field(s): ${(this.config.uniqueFields as string[]).join(", ")}`
                  : "Duplicate entry",
                timestamp: new Date().toISOString(),
              },
            },
          },
        },
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              success: false,
              error: {
                type: "SERVER_ERROR",
                message: "An unexpected error occurred",
                timestamp: new Date().toISOString(),
              },
            },
          },
        },
      },
    };
  }

  /**
   * Generate all CRUD paths
   * @returns {Record<string, unknown>} Path definitions
   */
  private generatePaths(): Record<string, unknown> {
    const capitalizedName =
      this.config.resourceName.charAt(0).toUpperCase() +
      this.config.resourceName.slice(1);

    return {
      [this.config.basePath]: {
        get: {
          tags: [capitalizedName],
          summary: `List all ${this.config.resourceName}`,
          description: `Retrieve a list of all ${this.config.resourceName} with optional filtering`,
          parameters: this.generateQueryParameters(),
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ListResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "array",
                            items: {
                              $ref: `#/components/schemas/${capitalizedName}`,
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "500": { $ref: "#/components/responses/ServerError" },
          },
        },
        post: {
          tags: [capitalizedName],
          summary: `Create a new ${this.config.resourceName.slice(0, -1)}`,
          description: `Create a new ${this.config.resourceName.slice(0, -1)} entity`,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${capitalizedName}Create`,
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Entity created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            $ref: `#/components/schemas/${capitalizedName}`,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "409": { $ref: "#/components/responses/DuplicateError" },
            "500": { $ref: "#/components/responses/ServerError" },
          },
        },
      },
      [`${this.config.basePath}/{id}`]: {
        get: {
          tags: [capitalizedName],
          summary: `Get ${this.config.resourceName.slice(0, -1)} by ID`,
          description: `Retrieve a single ${this.config.resourceName.slice(0, -1)} by its ID`,
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "MongoDB ObjectId",
              schema: {
                type: "string",
                pattern: "^[a-f\\d]{24}$",
                example: "507f1f77bcf86cd799439011",
              },
            },
          ],
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            $ref: `#/components/schemas/${capitalizedName}`,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "404": { $ref: "#/components/responses/NotFoundError" },
            "500": { $ref: "#/components/responses/ServerError" },
          },
        },
        patch: {
          tags: [capitalizedName],
          summary: `Update ${this.config.resourceName.slice(0, -1)}`,
          description: `Partially update a ${this.config.resourceName.slice(0, -1)} by its ID`,
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "MongoDB ObjectId",
              schema: {
                type: "string",
                pattern: "^[a-f\\d]{24}$",
                example: "507f1f77bcf86cd799439011",
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: `#/components/schemas/${capitalizedName}Update`,
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Entity updated successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/SuccessResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            $ref: `#/components/schemas/${capitalizedName}`,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "404": { $ref: "#/components/responses/NotFoundError" },
            "500": { $ref: "#/components/responses/ServerError" },
          },
        },
        delete: {
          tags: [capitalizedName],
          summary: `Delete ${this.config.resourceName.slice(0, -1)}`,
          description: `Delete a ${this.config.resourceName.slice(0, -1)} by its ID`,
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "MongoDB ObjectId",
              schema: {
                type: "string",
                pattern: "^[a-f\\d]{24}$",
                example: "507f1f77bcf86cd799439011",
              },
            },
          ],
          responses: {
            "200": {
              description: "Entity deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: {
                        type: "string",
                        example: "Entity deleted successfully",
                      },
                    },
                  },
                },
              },
            },
            "404": { $ref: "#/components/responses/NotFoundError" },
            "500": { $ref: "#/components/responses/ServerError" },
          },
        },
      },
    };
  }

  /**
   * Generate query parameters for filtering
   * @returns {unknown[]} Query parameter definitions
   */
  private generateQueryParameters(): unknown[] {
    const parameters: unknown[] = [];

    if (this.swaggerSchema.properties) {
      for (const [key, value] of Object.entries(
        this.swaggerSchema.properties,
      )) {
        parameters.push({
          name: key,
          in: "query",
          description: `Filter by ${key}`,
          required: false,
          schema: value,
        });
      }
    }

    return parameters;
  }
}

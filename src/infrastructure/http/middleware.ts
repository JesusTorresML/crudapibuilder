import type { Request, Response, NextFunction } from "express";
import type { ZodObject } from "zod";
import { ZodError } from "zod";
import type { RequestHandler } from "express";
import { ValidationError } from "#root/config/errors.js";

/**
 * Advanced validation middleware that provides comprehensive request validation
 * using Zod schemas with improved error handling and type coercion.
 *
 * @template TEntity - The domain entity type being validated
 * @param {ZodSchema} schema - Zod schema for validation
 * @param {ValidationOptions} [options] - Additional validation configuration
 * @returns {RequestHandler} Express middleware function
 */
export function validationMiddleware<TEntity>(
  schema: ZodObject<any>,
  options: ValidationOptions = {},
): RequestHandler {
  const {
    allowUnknownFields = false,
    coerceTypes = true,
    strictMode = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const operation = determineOperation(req);

      switch (operation) {
        case "CREATE":
          handleCreateValidation<TEntity>(req, res, schema, {
            allowUnknownFields,
            strictMode,
          });
          break;
        case "UPDATE":
          handleUpdateValidation<TEntity>(req, res, schema, {
            allowUnknownFields,
          });
          break;
        case "FIND":
          handleFindValidation<TEntity>(req, res, schema, { coerceTypes });
          break;
        default:
          throw new ValidationError({
            message: "Unsupported operation type",
            violations: [
              `Operation ${operation} is not supported by this middleware`,
            ],
          });
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError({
          message: "Request validation failed",
          violations: error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          ),
        });
        next(validationError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Configuration options for validation middleware behavior.
 */
interface ValidationOptions {
  /** Whether to allow fields not defined in schema */
  allowUnknownFields?: boolean;
  /** Whether to attempt type coercion for query parameters */
  coerceTypes?: boolean;
  /** Whether to use strict validation mode */
  strictMode?: boolean;
}

/**
 * Determines the type of operation based on HTTP method and path.
 *
 * @param {Request} req - Express request object
 * @returns {string} Operation type: CREATE, UPDATE, or FIND
 */
function determineOperation(req: Request): string {
  if (req.method === "POST" && req.route.path === "/") {
    return "CREATE";
  }
  if (req.method === "PATCH" || req.method === "PUT") {
    return "UPDATE";
  }
  if (req.method === "GET") {
    return "FIND";
  }
  return "UNKNOWN";
}

/**
 * Handles validation for entity creation requests.
 * Validates complete entity data against full schema.
 *
 * @template TEntity - Entity type being created
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {ZodSchema} schema - Validation schema
 * @param options - Options object.
 * @param options.allowUnknownFields - Strict mode -> AllowUnknown fields
 * @param options.strictMode -
 * @param {Object} options - Validation options
 */
function handleCreateValidation<TEntity>(
  req: Request,
  res: Response,
  schema: ZodObject<any>,
  options: { allowUnknownFields: boolean; strictMode: boolean },
): void {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ValidationError({
      message: "Request body is required for creation",
      field: "body",
      violations: ["Request body cannot be empty"],
    });
  }

  let validationSchema = schema;
  if (!options.allowUnknownFields) {
    validationSchema = schema.strict();
  }

  const parsed = validationSchema.parse(req.body);
  res.locals.createDto = parsed as TEntity;
}

/**
 * Handles validation for entity update requests.
 * Validates partial entity data against partial schema.
 *
 * @template TEntity - Entity type being updated
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {ZodSchema} schema - Validation schema
 * @param options.allowUnknownFields
 * @param {Object} options - Validation options
 */
function handleUpdateValidation<TEntity>(
  req: Request,
  res: Response,
  schema: ZodObject<any>,
  options: { allowUnknownFields: boolean },
): void {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ValidationError({
      message: "Request body is required for update",
      field: "body",
      violations: ["At least one field must be provided for update"],
    });
  }

  let partialSchema = schema.partial();
  if (!options.allowUnknownFields) {
    partialSchema = partialSchema.strict();
  }

  const parsed = partialSchema.parse(req.body);
  res.locals.updateDto = parsed as Partial<TEntity>;
}

/**
 * Handles validation for entity search/find requests.
 * Validates and coerces query parameters.
 *
 * @template TEntity - Entity type being searched
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {ZodSchema} schema - Validation schema
 * @param options.coerceTypes
 * @param {Object} options - Validation options
 */
function handleFindValidation<TEntity>(
  req: Request,
  res: Response,
  schema: ZodObject<any>,
  options: { coerceTypes: boolean },
): void {
  const queryParams = req.query as Record<string, unknown>;

  // Remove pagination parameters from validation
  const { skip, limit, sortBy, sortOrder, ...filterParams } = queryParams;

  let processedParams = filterParams;

  if (options.coerceTypes) {
    processedParams = coerceQueryParameters(filterParams);
  }

  const partialSchema = schema.partial();
  const parsed = partialSchema.parse(processedParams);
  res.locals.findDto = parsed as Partial<TEntity>;
}

/**
 * Attempts to coerce string query parameters to appropriate types.
 * Handles boolean, number, and date coercion.
 *
 * @param {Record<string, unknown>} params - Raw query parameters
 * @returns {Record<string, unknown>} Coerced parameters
 */
function coerceQueryParameters(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      // Boolean coercion
      if (value === "true") {
        coerced[key] = true;
      } else if (value === "false") {
        coerced[key] = false;
      }
      // Number coercion
      else if (!isNaN(Number(value)) && value.trim() !== "") {
        coerced[key] = Number(value);
      }
      // Date coercion (ISO format)
      else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          coerced[key] = date;
        } else {
          coerced[key] = value;
        }
      } else {
        coerced[key] = value;
      }
    } else {
      coerced[key] = value;
    }
  }

  return coerced;
}

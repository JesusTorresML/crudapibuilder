import type { Request, Response, NextFunction } from "express";
import type { ZodObject } from "zod";

/**
 * Creates a middleware that validates request body using Zod schema
 * and assigns the parsed DTO into `res.locals`.
 *
 * @template T - The domain entity type
 * @param schema - Zod schema of the entity
 */
export function validationMiddleware<T>(schema: ZodObject<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // CREATE
      if (req.method === "POST" && req.path === "/") {
        const parsed = schema.parse(req.body);
        res.locals.createDto = parsed as T;
      }

      // UPDATE
      if (req.method === "PATCH") {
        const parsed = schema.partial().parse(req.body);
        res.locals.updateDto = parsed as Partial<T>;
      }

      // FIND
      if (req.method === "GET") {
        const normalized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === "string") {
            // Try to coerce number/boolean
            if (value === "true" || value === "false") {
              normalized[key] = value === "true";
            } else if (!isNaN(Number(value))) {
              normalized[key] = Number(value);
            } else {
              normalized[key] = value;
            }
          } else {
            normalized[key] = value;
          }
        }
        const parsed = schema.partial().parse(normalized);
        res.locals.findDto = parsed as Partial<T>;
      }

      next();
    } catch (err) {
      res.status(400).json({
        error: "Validation failed",
        details: (err as any).issues ?? (err as Error).message,
      });
    }
  };
}

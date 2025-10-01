import { z } from "zod";
import type { SchemaDef } from "./types.js";

/**
 * Wraps a Zod schema with `.optional()` and/or `.default()`.
 * @param {z.ZodTypeAny} schema - The Zod schema to wrap
 * @param {boolean | undefined} required - Whether the field is required
 * @param {unknown | undefined} def - Default value for the field
 * @returns {z.ZodTypeAny} The wrapped schema
 */
function withOptionalAndDefault<T extends z.ZodTypeAny>(
  schema: T,
  required: boolean | undefined,
  def: unknown | undefined,
): z.ZodTypeAny {
  let out: z.ZodTypeAny = schema;
  if (required === false) {
    out = out.optional();
  }
  if (def !== undefined) {
    out = out.default(def);
  }
  return out;
}

/**
 * Builds a Zod object schema from a declarative schema definition.
 *
 * @param {TDef} def - The declarative schema definition
 * @returns {z.ZodObject<Record<string, z.ZodTypeAny>>} A ZodObject schema
 */
export function buildSchema<TDef extends SchemaDef>(
  def: TDef,
): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, cfg] of Object.entries(def)) {
    let schema: z.ZodTypeAny;

    switch (cfg.type) {
      case "string": {
        let s = z.string();
        if (cfg.min !== undefined) s = s.min(cfg.min);
        if (cfg.max !== undefined) s = s.max(cfg.max);
        if (cfg.regex) s = s.regex(cfg.regex);
        schema = withOptionalAndDefault(s, cfg.required, cfg.default);
        break;
      }
      case "number": {
        let s = z.number();
        if (cfg.int) s = s.int();
        if (cfg.min !== undefined) s = s.min(cfg.min);
        if (cfg.max !== undefined) s = s.max(cfg.max);
        schema = withOptionalAndDefault(s, cfg.required, cfg.default);
        break;
      }
      case "boolean": {
        schema = withOptionalAndDefault(z.boolean(), cfg.required, cfg.default);
        break;
      }
      case "date": {
        schema = withOptionalAndDefault(
          z.string().datetime(),
          cfg.required,
          cfg.default,
        );
        break;
      }
      case "enum": {
        schema = withOptionalAndDefault(
          z.enum(cfg.values),
          cfg.required,
          cfg.default,
        );
        break;
      }
      case "array": {
        const inner = buildSchema({ __inner: cfg.items }).shape.__inner;
        schema = withOptionalAndDefault(
          z.array(inner),
          cfg.required,
          cfg.default,
        );
        break;
      }
      case "object": {
        schema = withOptionalAndDefault(
          buildSchema(cfg.properties),
          cfg.required,
          undefined,
        );
        break;
      }
      default: {
        const never: never = cfg as never;
        throw new Error(
          `Unknown field type for '${key}': ${JSON.stringify(never)}`,
        );
      }
    }

    shape[key] = schema;
  }

  return z.object(shape) as z.ZodObject<Record<string, z.ZodTypeAny>>;
}

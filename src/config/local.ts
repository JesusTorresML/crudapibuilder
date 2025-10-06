import convict from "convict";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { Config } from "convict";

import { configSchema } from "./schema.js";
import type { AppConfig } from "./types.js";
import { CustomError } from "#config/errors.js";

const config: Config<AppConfig> = convict<AppConfig>(configSchema);

const moduleDir: string = path.dirname(fileURLToPath(import.meta.url));
const localConfigPath: string = path.resolve(
  moduleDir,
  "../../../config/local.json",
);

/*
 * 3. Validate the local configuration file to loade it if exists.
 */
if (fs.existsSync(localConfigPath)) {
  config.loadFile(localConfigPath);
}

/**
 * 4. Perform validation.
 * It checks all values against the format rules in the schema (e.g., 'port', 'nat').
 * With `allowed: 'strict'`, it will throw an error if any properties in the config
 * files or environment variables are not defined in the schema.
 * Most importantly, it ensures that secrets with `default: null` have been provided.
 */
try {
  config.validate({ allowed: "strict" });
} catch (error) {
  throw new CustomError({
    name: "CONFIG_ERROR",
    message: "Configuration validation error.",
    cause: error,
  });
}

/**
 * 5. Export a frozen, validated, and fully typed configuration object.
 */
export const localConfig: AppConfig = config.getProperties();

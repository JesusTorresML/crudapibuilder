import type { Schema } from "convict";
import type { AppConfig } from "./types";

/**
 * @const configSchema
 * @description The configuration schema using Convict, defining each RPC endpoint
 * as a separate, configurable object to allow for individual environment variable mapping.
 */
export const configSchema: Schema<AppConfig> = {
  server: {
    hostname: {
      doc: "APIserver ip",
      format: String,
      default: "localhost",
    },
    port: {
      doc: "API Port",
      format: Number,
      default: 1234,
    },
    allowedOrigins: ["http://localhost", "http://localhost:5000"],
    rateLimitWindowMs: 300,
    rateLimitMaxRequests: 100,
  },

  mongo: {
    host: {
      doc: "Mongodb ServerHost",
      format: String,
      default: "localhost",
    },
    port: {
      doc: "Mongodb ServerPort",
      format: String,
      default: "27017",
    },
    compressionLevel: {
      doc: "Mongodb compressionLevel",
      format: Number,
      default: 6,
    },
    compresors: ["zlib", "snappy", "zstd"],
  },

  database: {
    name: "default_database",
    collection: " default_collection",
  },
};

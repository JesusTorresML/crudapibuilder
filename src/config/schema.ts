import type { Schema } from "convict";
import type { AppConfig } from "./types";

/**
 * @const configSchema
 * @description The configuration schema using Convict, defining each RPC endpoint
 * as a separate, configurable object to allow for individual environment variable mapping.
 */
export const configSchema: Schema<AppConfig> = {
  apiServerConfig: {
    hostname: {
      doc: "APIserver ip",
      format: String,
      default: "localhost",
    },
    port: {
      doc: "API Port",
      format: String,
      default: "1234",
    },
    allowedOrigins: ["http://localhost", "http://localhost:1234"],
  },

  database: {
    serverHost: {
      doc: "Mongodb ServerHost",
      format: String,
      default: "localhost",
    },
    serverPort: {
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
};

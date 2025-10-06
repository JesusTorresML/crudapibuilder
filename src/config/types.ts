import type { CompressorName } from "mongodb";

// The root type for our raw convict configuration object.
export type AppConfig = {
  database: DatabaseConfig;
  mongo: MongoConfig;
  server: ApiServerConfig;
};

// ----------------------------------------------------------
// API Server Config
// ----------------------------------------------------------

export type ApiServerConfig = {
  hostname: string;
  port: number;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
};

// ----------------------------------------------------------
// Database Config
// ----------------------------------------------------------

export type DatabaseConfig = {
  name: string;
  collection: string;
};

export type MongoConfig = {
  host: string;
  port: string;
  compressionLevel?: 0 | 6 | 1 | 8 | 2 | 3 | 4 | 5 | 7 | 9;
  compresors?: Array<CompressorName>;
};

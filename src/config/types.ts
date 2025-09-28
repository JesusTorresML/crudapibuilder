import type { CompressorName } from "mongodb";

// The root type for our raw convict configuration object.
export type AppConfig = {
  apiServerConfig: ApiServerConfig;
  database: DatabaseConfig;
};

// ----------------------------------------------------------
// API Server Config
// ----------------------------------------------------------

export type ApiServerConfig = {
  hostname: string;
  port: string;
  allowedOrigins: string[];
};

// ----------------------------------------------------------
// Database Config
// ----------------------------------------------------------

export type DatabaseConfig = {
  serverHost: string;
  serverPort: string;
  compressionLevel: 0 | 6 | 1 | 8 | 2 | 3 | 4 | 5 | 7 | 9;
  compresors: Array<CompressorName>;
};

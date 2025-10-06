import type { CompressorName } from "mongodb";

export type MongoClientOptions = {
  host: string;
  port: string;
  compressionLevel?: 0 | 6 | 1 | 8 | 2 | 3 | 4 | 5 | 7 | 9;
  compresors?: Array<CompressorName>;
};

import type { z } from "zod";
import { buildSchema } from "../infrastructure/tools/schemabuilder/index.js";
import { ApiBuilder } from "../infrastructure/http/apibuilder.js";
import { localConfig } from "#root/config/local.js";

const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});

// type Product = { name: string; price: number };
export type InferSchema<T> = T extends z.ZodTypeAny ? z.infer<T> : never;

export type Product = InferSchema<typeof ProductSchema>;

(async (): Promise<void> => {
  const builder = new ApiBuilder<Product>(
    {
      mongoClientOptions: {
        serverHost: localConfig.database.serverHost,
        serverPort: localConfig.database.serverPort,
      },
      dbName: "mydb",
      collection: "products",
      schema: ProductSchema,
      port: 5000,
      uniqueFields: ["name"],
    },
    localConfig,
  );

  await builder.buildServer(); // runs immediately
})();

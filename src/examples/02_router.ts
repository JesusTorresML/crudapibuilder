import express from "express";
import { buildSchema } from "../infrastructure/tools/schemabuilder/index.js";
import { ApiBuilder } from "../infrastructure/http/apibuilder.js";
import type { Logger } from "#root/domain/logger.interface.js";
import { WinstonLogger } from "#root/infrastructure/index.js";
import { localConfig } from "#root/config/local.js";

const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});
type Product = { name: string; price: number };

const app = express();

(async (): Promise<void> => {
  const logger: Logger = new WinstonLogger();
  const builder = new ApiBuilder<Product>(
    {
      dbName: "mydb",
      collection: "products",
      schema: ProductSchema,
      uniqueFields: ["name"],
    },
    localConfig,
  );

  const productRouter = await builder.buildRouter();
  app.use("/products", productRouter);

  app.listen(4000, () =>
    logger.info("Custom server running at http://localhost:4000"),
  );
})();

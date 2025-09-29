import express from "express";
import { buildSchema } from "../infrastructure/tools/schemabuilder/index.js";
import { ApiBuilder } from "../infrastructure/http/apibuilder.js";
import { localConfig } from "#root/config/local.js";

const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});
type Product = { name: string; price: number };

const app = express();

(async () => {
  const builder = new ApiBuilder<Product>(
    {
      mongoClientOptions: {
        serverHost: localConfig.database.serverHost,
        serverPort: localConfig.database.serverPort,
      },
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
    console.log("Custom server running at http://localhost:4000"),
  );
})();

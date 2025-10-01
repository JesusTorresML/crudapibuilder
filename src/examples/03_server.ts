import { buildSchema } from "../infrastructure/tools/schemabuilder/index.js";
import { ApiBuilder } from "../infrastructure/http/apibuilder.js";

const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});

type Product = { name: string; price: number };

(async (): Promise<void> => {
  const builder = new ApiBuilder<Product>({
    dbName: "mydb",
    collection: "products",
    schema: ProductSchema,
    port: 5000,
    mongoConnection: {
      serverHost: "localhost",
      serverPort: "27017",
    },
  });

  await builder.buildServer(); // runs immediately
})();

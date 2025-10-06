import { buildSchema, ApiBuilder } from "#infrastructure/index.js";

const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});

type Product = { name: string; price: number };

(async (): Promise<void> => {
  const builder = new ApiBuilder<Product>({
    apiPort: 7000,
    database: {
      name: "mydb",
      collection: "products",
    },
    schema: ProductSchema,
    mongoConfig: {
      host: "localhost",
      port: "27017",
    },
    swagger: {
      enabled: true,
      title: "Products API - Test",
    },
  });

  await builder.buildServer(); // runs immediately
})();

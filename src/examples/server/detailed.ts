import { buildSchema, ApiBuilder } from "#infrastructure/index.js";

const ProductSchema = buildSchema({
  name: {
    type: "string",
    min: 3,
    max: 100,
  },
  description: {
    type: "string",
    min: 10,
  },
  price: {
    type: "number",
    min: 0,
  },
  category: {
    type: "enum",
    values: ["electronics", "clothing", "books", "food"] as const,
  },
  inStock: {
    type: "boolean",
    default: true,
  },
  sku: {
    type: "string",
    min: 5,
    max: 20,
  },
  tags: {
    type: "array",
    items: { type: "string" },
  },
  rating: {
    type: "number",
    min: 0,
    max: 5,
  },
});

type Product = {
  name: string;
  description: string;
  price: number;
  category: "electronics" | "clothing" | "books" | "food";
  inStock: boolean;
  sku: string;
  tags: string[];
  rating: number;
};

(async (): Promise<void> => {
  const builder = new ApiBuilder<Product>({
    apiPort: 5000,
    database: {
      name: "ecommerce",
      collection: "products",
    },
    schema: ProductSchema,

    mongoConfig: {
      host: "localhost",
      port: "27017",
    },

    uniqueFields: ["sku"],
    swagger: {
      enabled: true,
      title: "E-commerce Products API",
      description: `
# Products API

Complete product management system with:
- Inventory tracking
- Category management
- Rating system
- Tag-based organization

## Features
- ✅ Full CRUD operations
- ✅ Automatic validation with Zod
- ✅ Unique SKU enforcement
- ✅ MongoDB integration
- ✅ Winston logging

## Authentication
Currently, this API does not require authentication. 
In production, implement JWT or API key authentication.
      `,
      version: "1.0.0",
      path: "/api-docs",
    },
  });

  await builder.buildServer(); // runs immediately
})();

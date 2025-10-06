// src/examples/multi-api.ts
import {
  ApiBuilder,
  createMultiRouterServer,
  buildSchema,
} from "#infrastructure/index.js";

// Define schemas
const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});

const DocumentSchema = buildSchema({
  title: { type: "string", min: 1 },
  content: { type: "string", min: 10 },
});

type Product = {
  name: string;
  price: number;
};

type Document = {
  title: string;
  contenct: string;
};

(async (): Promise<void> => {
  // Create builders
  const serverPort: number = 4500;

  const productBuilder = new ApiBuilder<Product>({
    apiPort: serverPort,
    database: {
      name: "mydb",
      collection: "products",
    },
    schema: ProductSchema,
    uniqueFields: ["name"],
  });

  const docBuilder = new ApiBuilder<Document>({
    apiPort: serverPort,
    database: {
      name: "mydb",
      collection: "documents",
    },
    schema: DocumentSchema,
    uniqueFields: ["title"],
  });

  // Build routers
  const productRouter = await productBuilder.buildRouter();
  const docRouter = await docBuilder.buildRouter();

  // Create server
  await createMultiRouterServer(
    [
      {
        path: "/products",
        router: productRouter,
        swagger: {
          enabled: true,
          title: "Products API",
          description: "Manage products inventory",
          schema: ProductSchema,
          uniqueFields: ["name"],
          resourceName: "products",
        },
      },
      {
        path: "/documents",
        router: docRouter,
        swagger: {
          enabled: true,
          title: "Documents API",
          description: "Document management system",
          schema: DocumentSchema,
          uniqueFields: ["title"],
          resourceName: "documents",
        },
      },
    ],
    {
      port: serverPort,
      apiVersion: "v1",
      enableSwagger: true,
    },
  );
})();

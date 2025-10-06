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

type Product = {
  name: string;
  price: number;
};

type Order = {
  productId: string;
  quantity: number;
};

const OrderSchema = buildSchema({
  productId: { type: "string" },
  quantity: { type: "number", min: 1 },
  status: {
    type: "enum",
    values: ["pending", "shipped", "delivered"] as const,
  },
});

// Create builders
const productBuilder = new ApiBuilder<Product>({
  apiPort: 5000,
  database: { name: "shop", collection: "products" },
  schema: ProductSchema,
  uniqueFields: ["name"],
});

const orderBuilder = new ApiBuilder<Order>({
  apiPort: 5000,
  database: { name: "shop", collection: "orders" },
  schema: OrderSchema,
});

// Build routers
const productRouter = await productBuilder.buildRouter();
const orderRouter = await orderBuilder.buildRouter();

// Create server with multiple routers
await createMultiRouterServer(
  [
    {
      path: "/products",
      router: productRouter,
      swagger: {
        enabled: true,
        title: "Products API",
        schema: ProductSchema,
        uniqueFields: ["name"],
        resourceName: "products",
      },
    },
    {
      path: "/orders",
      router: orderRouter,
      swagger: {
        enabled: true,
        title: "Orders API",
        schema: OrderSchema,
        resourceName: "orders",
      },
    },
  ],
  {
    port: 5000,
    apiVersion: "v1",
    enableSwagger: true,
  },
);

# CRUD API REST Framework (ApiBuilder)

A lightweight TypeScript framework for building production-ready CRUD REST APIs with Express + MongoDB, featuring automatic Swagger documentation, runtime validation with Zod, structured logging with Winston, and a clean layered architecture.

> **Goal:** Generate fully functional CRUD APIs with minimal boilerplate while maintaining best practices and type safety throughout the stack.

---

## ✨ Features

- **Complete CRUD Operations**: Create, Read, Update, Delete, and Find with pagination
- **Automatic API Documentation**: Swagger/OpenAPI docs generated from Zod schemas
- **Runtime Validation**: Request validation with Zod for body, params, and query strings
- **Unique Constraints**: MongoDB unique indexes with duplicate detection
- **Clean Architecture**: Layered design (Domain → Repository → Service → Controller → Router)
- **Type Safety**: Full TypeScript support with generics throughout
- **Structured Logging**: Winston logger with daily rotation and multiple log levels
- **Error Handling**: Centralized error handling with typed responses
- **Flexible Deployment**: Use as standalone server or mount routers in existing apps
- **Multiple APIs**: Support for multiple resources in a single server

---

## 📋 Table of Contents

- [Requirements](#-requirements)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Configuration](#-configuration)
- [Schema Builder](#-schema-builder)
- [Validation](#-validation--typing)
- [Unique Fields](#-unique-fields--indexes)
- [Logging](#-logging)
- [Error Handling](#-error-handling)
- [Multiple APIs](#-serving-multiple-apis)
- [API Examples](#-api-examples)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🔧 Requirements

- **Node.js** 18+ (native fetch support required)
- **MongoDB** 6+
- **TypeScript** 5+

---

## 📦 Installation

Add as a dependency in your `package.json`:

```json
{
  "dependencies": {
    "crud-api-builder": "git+https://codeberg.org/jesustorresml07/CrudApiBuilder.git#main"
  }
}
```

Then install:

```bash
npm install
```

---

## 🚀 Quick Start

### Standalone Server

Create an `index.ts` file:

```typescript
import { buildSchema, ApiBuilder } from "crud-api-builder";

// Define your schema
const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
  category: {
    type: "enum",
    values: ["electronics", "books", "clothing"] as const,
  },
  inStock: { type: "boolean", default: true },
});

// Define your entity type
type Product = {
  name: string;
  price: number;
  category: "electronics" | "books" | "clothing";
  inStock: boolean;
};

// Create and start the API
(async () => {
  const builder = new ApiBuilder<Product>({
    apiPort: 6000,
    database: {
      name: "mydb",
      collection: "products",
    },
    schema: ProductSchema,
    uniqueFields: ["name"], // Ensure name is unique
    mongoConfig: {
      host: "localhost",
      port: "27017",
    },
    swagger: {
      enabled: true,
      title: "Products API",
      description: "API for managing products",
      path: "/docs",
    },
  });

  await builder.buildServer();
  console.log("🚀 Server running at http://localhost:6000");
  console.log("📚 API Docs at http://localhost:6000/docs");
})();
```

Run it:

```bash
npx ts-node index.ts
```

### Generated Endpoints

```
POST   /api/v1/products         → Create product
GET    /api/v1/products/:id     → Get product by ID
PATCH  /api/v1/products/:id     → Update product
DELETE /api/v1/products/:id     → Delete product
GET    /api/v1/products         → List/filter products
GET    /docs                    → Swagger documentation
GET    /health                  → Health check
```

---

## 🧱 Architecture

The framework follows a clean, layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│                      HTTP Layer                         │
│  ┌──────────┐ ┌────────────┐ ┌──────────────────┐     │
│  │  Router  │→│ Middleware │→│   Controller     │     │
│  └──────────┘ └────────────┘ └──────────────────┘     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                     │
│              ┌─────────────────────┐                    │
│              │   CrudService       │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Domain Layer                          │
│    ┌──────────┐  ┌───────────┐  ┌─────────────┐       │
│    │Interfaces│  │  Entities  │  │   Types     │       │
│    └──────────┘  └───────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Layer                     │
│  ┌──────────────┐  ┌────────┐  ┌──────────────────┐   │
│  │ MongoDbRepo  │  │ Logger │  │  SchemaBuilder   │   │
│  └──────────────┘  └────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key Components

- **Router**: Maps HTTP endpoints and applies validation middleware
- **Controller**: Handles HTTP requests/responses, delegates to service
- **Service**: Implements business logic, orchestrates repository operations
- **Repository**: Direct MongoDB operations with error handling
- **SchemaBuilder**: Declarative Zod schema construction
- **Logger**: Structured logging with Winston

---

## ⚙️ Configuration

### ApiBuilderOptions

```typescript
interface ApiBuilderOptions<T> {
  // Required
  apiPort: number;
  database: {
    name: string;
    collection: string;
  };
  schema: ZodObject<Record<string, ZodType>>;

  // Optional
  uniqueFields?: (keyof T)[];
  mongoConfig?: {
    host?: string;           // default: "localhost"
    port?: string;           // default: "27017"
    compressionLevel?: 0-9;  // default: 6
    compressors?: Array<"zlib" | "snappy" | "zstd">;
  };
  serverConfig?: {
    allowedOrigins?: string[];
    rateLimitWindowMs?: number;      // default: 900000 (15 min)
    rateLimitMaxRequests?: number;   // default: 100
  };
  swagger?: {
    enabled?: boolean;        // default: true
    title?: string;
    description?: string;
    version?: string;         // default: "1.0.0"
    path?: string;           // default: "/docs"
  };
}
```

### Environment Configuration

You can also use configuration files with Convict (optional):

```json
// config/local.json
{
  "apiServerConfig": {
    "port": 8540,
    "allowedOrigins": ["http://localhost:5173"]
  },
  "database": {
    "serverHost": "localhost",
    "serverPort": "27017"
  }
}
```

---

## 🛠️ Schema Builder

The framework includes a declarative schema builder for Zod:

```typescript
const UserSchema = buildSchema({
  // String validations
  username: {
    type: "string",
    min: 3,
    max: 20,
    required: true,
  },
  email: {
    type: "string",
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  // Number validations
  age: {
    type: "number",
    min: 18,
    max: 120,
    int: true,
  },
  balance: {
    type: "number",
    min: 0,
    default: 0,
  },

  // Boolean
  isActive: {
    type: "boolean",
    default: true,
  },

  // Enum
  role: {
    type: "enum",
    values: ["user", "admin", "moderator"] as const,
    default: "user",
  },

  // Array
  tags: {
    type: "array",
    items: { type: "string" },
  },

  // Nested object
  address: {
    type: "object",
    properties: {
      street: { type: "string" },
      city: { type: "string" },
      zipCode: { type: "string", regex: /^\d{5}$/ },
    },
  },

  // Date
  createdAt: {
    type: "date",
  },
});
```

Or use raw Zod if you prefer:

```typescript
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  inStock: z.boolean().default(true),
});
```

---

## 🔍 Validation & Typing

### Automatic Validation

All requests are automatically validated:

- **POST /**: Full schema validation (all required fields)
- **PATCH /:id**: Partial schema validation (any subset of fields)
- **GET /**: Query parameter validation with type coercion

### Type Coercion for Query Parameters

The middleware automatically coerces query string values:

```typescript
// URL: /products?price=100&inStock=true&category=electronics

// Becomes:
{
  price: 100,        // string → number
  inStock: true,     // string → boolean
  category: "electronics"  // remains string
}
```

### Error Responses

Validation errors return structured responses:

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "timestamp": "2025-10-05T19:34:03.000Z",
    "details": {
      "field": "price",
      "violations": ["price must be a positive number"]
    }
  }
}
```

---

## 🔐 Unique Fields & Indexes

Declare unique constraints per entity:

```typescript
const builder = new ApiBuilder<User>({
  // ...
  uniqueFields: ["email", "username"],
  schema: UserSchema,
});
```

**Behavior:**

- MongoDB unique indexes are automatically created on initialization
- Duplicate detection happens **before** database insertion
- `create()` returns `null` on duplicate (not an error)
- `update()` throws `DUPLICATE_ERROR` if it would create a duplicate
- Clear error messages indicate which field caused the violation

---

## 📝 Logging

Winston logger with automatic daily rotation:

### Log Files

```
logs/
├── error-2025-10-05.log       # Error logs only
├── combined-2025-10-05.log    # All logs (info, warn, error)
└── debug-2025-10-05.log       # Debug logs (development only)
```

### Log Levels

- **error**: System failures, exceptions
- **warn**: Unusual conditions, potential issues
- **info**: General operational messages
- **debug**: Detailed diagnostic information

### Example Output

```
[2025-10-05 19:34:03] [INFO]: Repository: Entity created successfully {"entityId":"507f1f77bcf86cd799439011","collectionName":"products"}
[2025-10-05 19:34:05] [ERROR]: Create operation failed {"error":"Duplicate key error","field":"name"}
```

### Configuration

Logs are automatically rotated:

- **Max file size**: 20-50 MB depending on level
- **Retention**: 3-14 days depending on level
- **Compression**: Automatic (gzip)

---

## 🚨 Error Handling

### Error Types

```typescript
enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR", // 400
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR", // 404
  DUPLICATE_ERROR = "DUPLICATE_ERROR", // 409
  DATABASE_ERROR = "DATABASE_ERROR", // 500
  SERVER_ERROR = "SERVER_ERROR", // 500
  ROUTE_NOT_FOUND = "ROUTE_NOT_FOUND", // 404
  CORS_ERROR = "CORS_ERROR", // 403
}
```

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "type": "NOT_FOUND_ERROR",
    "message": "Entity with ID 507f1f77bcf86cd799439011 not found",
    "timestamp": "2025-10-05T19:34:03.000Z",
    "details": {
      "requestedId": "507f1f77bcf86cd799439011"
    }
  }
}
```

---

## 🔀 Serving Multiple APIs

You can serve multiple resources from a single server:

```typescript
import {
  ApiBuilder,
  createMultiRouterServer,
  buildSchema,
} from "crud-api-builder";

// Define schemas
const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});

const OrderSchema = buildSchema({
  productId: { type: "string" },
  quantity: { type: "number", min: 1 },
});

type Product = {
  name: string;
  price: number;
};

type Order = {
  productId: string;
  quantity: number;
};

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
```

**Result:**

- Products API: `http://localhost:5000/api/v1/products`
- Orders API: `http://localhost:5000/api/v1/orders`
- Products Docs: `http://localhost:5000/docs/products`
- Orders Docs: `http://localhost:5000/docs/orders`

---

## 📡 API Examples

### Create Entity

```bash
curl -X POST http://localhost:6000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "price": 1200,
    "category": "electronics",
    "inStock": true
  }'
```

Response:

```json
{
  "success": true,
  "message": "Entity created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Laptop",
    "price": 1200,
    "category": "electronics",
    "inStock": true,
    "createdAt": "2025-10-05T19:34:03.000Z"
  },
  "timestamp": "2025-10-05T19:34:03.000Z"
}
```

### Get by ID

```bash
curl http://localhost:6000/api/v1/products/507f1f77bcf86cd799439011
```

### Update Entity

```bash
curl -X PATCH http://localhost:6000/api/v1/products/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"price": 999}'
```

### Delete Entity

```bash
curl -X DELETE http://localhost:6000/api/v1/products/507f1f77bcf86cd799439011
```

### List with Filtering

```bash
# Simple filter
curl "http://localhost:6000/api/v1/products?category=electronics"

# Multiple filters
curl "http://localhost:6000/api/v1/products?category=electronics&inStock=true"

# With pagination
curl "http://localhost:6000/api/v1/products?skip=0&limit=10&sortBy=price&sortOrder=desc"
```

Response:

```json
{
  "success": true,
  "message": "Entities retrieved successfully",
  "data": [...],
  "pagination": {
    "skip": 0,
    "limit": 10,
    "total": 42,
    "hasNext": true,
    "hasPrevious": false,
    "currentPage": 1,
    "totalPages": 5
  },
  "timestamp": "2025-10-05T19:34:03.000Z"
}
```

---

## 📁 Project Structure

```
src/
├── application/          # Business logic layer
│   └── services/
│       └── crud.ts      # Generic CRUD service
├── config/              # Configuration management
│   ├── errors.ts       # Error types and classes
│   ├── local.ts        # Convict configuration
│   ├── schema.ts       # Config schema
│   └── types.ts        # Config types
├── domain/              # Core domain layer
│   ├── models/
│   │   └── mongodocument.ts  # Base document type
│   ├── crudservice.interface.ts
│   ├── logger.interface.ts
│   └── mongo.interface.ts
├── infrastructure/      # Technical implementations
│   ├── http/
│   │   ├── builders/
│   │   │   ├── apibuilder.ts       # Main API builder
│   │   │   └── serverfactory.ts    # Multi-router server
│   │   ├── middlewares/
│   │   │   ├── datavalidator.ts    # Zod validation
│   │   │   └── errorhandler.ts     # Global error handler
│   │   ├── routing/
│   │   │   ├── controller.ts       # CRUD controller
│   │   │   └── router.ts           # Router factory
│   │   ├── security/
│   │   │   └── corsoptions.ts     # CORS configuration
│   │   └── swagger/
│   │       ├── generator.ts       # OpenAPI generation
│   │       └── middleware.ts      # Swagger UI middleware
│   ├── logger/
│   │   └── winston.logger.ts      # Winston implementation
│   ├── persistance/
│   │   ├── mongoconnection.ts     # MongoDB connection
│   │   └── mongorepo.ts           # Generic repository
│   └── tools/
│       └── schemabuilder/         # Declarative schema builder
└── examples/            # Usage examples
    ├── client/         # API client tests
    ├── mongorepo/      # Repository tests
    ├── router/         # Router examples
    └── server/         # Server examples
```

---

## 🧪 Development

### Setup

```bash
# Clone repository
git clone https://codeberg.org/jesustorresml07/CrudApiBuilder.git
cd CrudApiBuilder

# Install dependencies
npm install

# Run examples
npx ts-node src/examples/server/basic.ts
```

### Running Tests

```bash
# Repository tests
npx ts-node src/examples/mongorepo/users.ts

# Single router server
npx ts-node src/examples/router/singlerouter.ts

# Multiple routers server
npx ts-node src/examples/router/multiplerouters.ts

# Complete API client (requires server running)
npx ts-node src/examples/client/products.ts
```

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

---

## 🗺️ Roadmap

- [x] Automatic OpenAPI/Swagger documentation
- [x] Multiple APIs in single server
- [x] Comprehensive error handling
- [x] Structured logging with rotation
- [ ] Cursor-based pagination
- [ ] E2E tests with Supertest
- [ ] Soft delete support
- [ ] MongoDB aggregation pipeline support
- [ ] Redis caching layer
- [ ] Transaction support
- [ ] GraphQL adapter
- [ ] Authentication/Authorization middleware
- [ ] WebSocket support
- [ ] Rate limiting per endpoint

---

## 📄 License

This project is licensed under a **Dual License**:

### Non-Commercial Use (MIT-like)

Free for:

- Personal projects without revenue generation
- Educational/academic purposes
- Evaluation and testing
- Open-source projects with OSI-approved licenses
- Registered non-profit organizations

### Commercial Use

Requires a written commercial license for:

- Integration into products/services that are sold
- Use in for-profit company operations
- Paid consulting/support services

For commercial licensing inquiries, contact: **jesust07@gmail.com**

See the [LICENSE](LICENSE) file for complete terms.

---

## 👤 Author

**JESUS ALBERTO TORRES VELASQUEZ**

- Email: jesust07@gmail.com
- Codeberg: [@jesustorresml07](https://codeberg.org/jesustorresml07)

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All tests pass
2. Code follows ESLint rules
3. JSDoc comments are complete
4. New features include tests and examples

### How to Contribute

1. Fork on Codeberg
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

- **Issues**: [Codeberg Issues](https://codeberg.org/jesustorresml07/CrudApiBuilder/issues)
- **Email**: jesust07@gmail.com
- **Commercial Licensing**: jesust07@gmail.com

---

## 🔗 Links

- **Repository**: [https://codeberg.org/jesustorresml07/CrudApiBuilder](https://codeberg.org/jesustorresml07/CrudApiBuilder)
- **npm Package**: `crud-api-builder`

---

**Built with ❤️ using TypeScript, Express, MongoDB, Zod, and Winston**

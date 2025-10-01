# CRUD API REST Framework (CrudApiBuilder)

A lightweight TypeScript micro-framework that generates **productive CRUD APIs** on top of **Express + MongoDB**, with **runtime validation** powered by **Zod**, centralized logging with **Winston**, and a clean layered architecture: Repository → Service → Controller → Router.

> **Goal:** Spin up a fully working REST API with minimal boilerplate (entity + schema + collection) and best practices built-in.

---

## ✨ Features

- **Full CRUD** (Create/Read/Update/Delete and Find) generated from a Zod schema
- **Centralized validation** middleware for `POST`, `PATCH`, and `GET` (filters)
- **Unique field constraints** with MongoDB unique indexes and duplicate handling
- **Layered architecture** with generics: domain, repository, service, controller
- **Express router ready** to mount or **standalone server** with one call
- **Winston Logger** with daily log rotation and multiple log levels
- **Comprehensive error handling** with typed error responses
- **Type-safe** throughout the entire stack

---

## 🧱 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      HTTP Layer                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │  Router  │→ │ Middleware │→ │   Controller     │   │
│  └──────────┘  └────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│              ┌─────────────────────┐                    │
│              │   CrudService       │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Domain Layer                           │
│    ┌──────────┐  ┌───────────┐  ┌─────────────┐       │
│    │Interfaces│  │  Entities  │  │   Types     │       │
│    └──────────┘  └───────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Layer                      │
│  ┌──────────────┐  ┌────────┐  ┌──────────────────┐   │
│  │ MongoDbRepo  │  │ Logger │  │  SchemaBuilder   │   │
│  └──────────────┘  └────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key Components:**
- **Repository (MongoDbRepository)**: Direct MongoDB CRUD + unique indexes
- **Service (CrudService)**: Orchestrates repository, exposes domain API
- **Controller (CrudController)**: Express handlers calling the service
- **Router**: Maps endpoints and applies **validationMiddleware** (Zod)
- **SchemaBuilder** (optional): Declarative way to build Zod schemas
- **Logger (WinstonLogger)**: Structured logging with rotation

---

## 🔧 Requirements

- **Node.js** 18+
- **MongoDB** 6+
- **TypeScript** 5+

---

## Introduction

- Install dependences ```npm install```
- Compile ```npm run build```

## 🚀 Quick Start (Standalone Server)

```typescript
import { buildSchema } from "./src/infrastructure/tools/schemabuilder";
import { ApiBuilder } from "./src/infrastructure/http/apibuilder";
import { localConfig } from "./src/config/local";

const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});

type Product = { name: string; price: number };

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

  await builder.buildServer();
})();
```

API available at: `http://localhost:5000/products`

### Example Generated Endpoints

```
POST   /products         -> create (validates body against Zod schema)
GET    /products/:id     -> read by id
PATCH  /products/:id     -> update (validates partial body)
DELETE /products/:id     -> delete
GET    /products         -> list / filter (validates query params)
```

### Example Usage (cURL)

```bash
# Create
curl -X POST http://localhost:5000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":1200}'

# List all
curl http://localhost:5000/products

# Filter by name
curl "http://localhost:5000/products?name=Laptop"

# Get by ID
curl http://localhost:5000/products/<id>

# Update
curl -X PATCH http://localhost:5000/products/<id> \
  -H "Content-Type: application/json" \
  -d '{"price":999}'

# Delete
curl -X DELETE http://localhost:5000/products/<id>
```

---

## 🧪 Running Tests

The project includes comprehensive test files:

```bash
# Compile:
npm run build

# Test MongoDB repository directly
node dist dist/examples/01_mongorepo.ts

# Test router (mount in custom app)
node dist dist/examples/02_router.ts

# Test standalone server
node dist dist/examples/02_server.ts

# Test complete API client (server must be running)
node dist dist/examples/04_client.ts
```

---

## 🧭 Validation & Typing

- **Zod** validates **body** and **query** parameters
- For `GET /products`, the middleware attempts to **coerce** strings to `number`/`boolean` where possible (e.g., `?price=10` → number)
- For **create**, the full schema is required
- For **update/find**, a partial schema is applied

### Optional: Declarative Schema Builder

```typescript
const ProductSchema = buildSchema({
  name: { type: "string", min: 1, required: true },
  price: { type: "number", min: 0, int: false },
  category: { type: "enum", values: ["electronics", "books"] as const },
  inStock: { type: "boolean", default: true },
  tags: { type: "array", items: { type: "string" } },
});
```

> If you prefer **raw Zod**, you can provide that directly as well.

---

## 🔒 Unique Fields & Indexes

You can declare unique fields per entity:

```typescript
uniqueFields: ["name", "email"];
```

- On initialization, the repository creates **unique indexes** for these fields
- On `create`/`update`, duplicates are checked and reported clearly
- Returns `null` on duplicate creation instead of throwing

---

## 📝 Logging

- A **WinstonLogger** is provided with daily/automatic log rotation
- Logs are saved to `logs/` directory:
  - `error-YYYY-MM-DD.log` - Error logs only
  - `combined-YYYY-MM-DD.log` - All logs (info, warn, error)
  - `debug-YYYY-MM-DD.log` - Debug logs (development only)
- In development mode, it adds a `debug` channel
- Logs include structured metadata for better debugging

Example log output:
```
[2025-09-30 19:34:03] [INFO]: Repository: Entity created successfully {"entityId":"507f1f77bcf86cd799439011","collectionName":"products"}
```

---

## 🏗️ Project Structure

```
src/
├── application/              # Application services
│   └── services/
│       └── crud.ts          # Generic CRUD service
├── domain/                  # Domain layer (interfaces & types)
│   ├── crudservice.interface.ts
│   ├── logger.interface.ts
│   ├── mongo.interface.ts
│   └── models/
│       └── mongodocument.ts
├── infrastructure/          # Infrastructure implementations
│   ├── http/               # HTTP layer (Express)
│   │   ├── apibuilder.ts   # Main API builder
│   │   ├── controller.ts   # CRUD controller
│   │   ├── router.ts       # Router factory
│   │   ├── middleware.ts   # Validation middleware
│   │   ├── errorhandler.ts # Global error handler
│   │   └── corsoptions.ts  # CORS configuration
│   ├── persistance/        # Data persistence
│   │   ├── mongoconnection.ts
│   │   └── mongorepo.ts    # MongoDB repository
│   ├── logger/             # Logging
│   │   └── winston.logger.ts
│   └── tools/              # Utilities
│       ├── schemabuilder/  # Declarative schema builder
│       └── errors.ts       # Custom error types
├── config/                 # Configuration
│   ├── local.ts           # Config loader
│   ├── schema.ts          # Config schema
│   └── types.ts           # Config types
└── examples/              # Usage examples & tests
    ├── 01_mongorepo.ts    # Repository test
    ├── 02_test_router.ts  # Router integration
    ├── 02_test_server.ts  # Standalone server
    └── 04_test_client.ts  # API client test
```

---

## 📋 Configuration

Create a `config/local.json` file:

```json
{
  "apiServerConfig": {
    "port": "5000",
    "allowedOrigins": ["http://localhost:5000"],
    "rateLimitWindowMs": 900000,
    "rateLimitMaxRequests": 100
  },
  "database": {
    "serverHost": "localhost",
    "serverPort": "27017",
    "compressionLevel": 6,
    "compresors": ["zlib", "snappy", "zstd"]
  }
}
```

---

## 🔐 Error Handling

The framework includes comprehensive error handling:

```typescript
// Typed errors
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  DUPLICATE_ERROR = "DUPLICATE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
}

// Standardized error response
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "timestamp": "2025-09-30T19:34:03.000Z",
    "details": {
      "field": "price",
      "violations": ["price must be a positive number"]
    }
  }
}
```

---

## 🛠️ Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start MongoDB locally
4. Configure `config/local.json`
5. Run examples:
   ```bash
   mode dist/examples/02_server.ts
   ```

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

---

## 🗺️ Roadmap

- [ ] Generate **OpenAPI/Swagger** from Zod schemas
- [ ] Add **pagination helpers** and cursor-based pagination
- [ ] Add **E2E tests** with Supertest
- [ ] Support for **soft deletes**
- [ ] Add **aggregation pipeline** support
- [ ] Add **caching layer** with Redis
- [ ] Support for **transactions**
- [ ] Add **GraphQL adapter**

---

## 📄 License

This project is licensed under a **Dual License**:

- **Non-Commercial Use**: Free under MIT-like terms for personal projects, education, testing, open-source projects, and registered non-profit organizations.

- **Commercial Use**: Requires a written commercial license from the copyright holder.

### Non-Commercial Use Includes:
- Personal projects without revenue generation
- Educational/academic purposes
- Evaluation and testing
- Open-source projects with OSI-approved licenses
- Registered non-profit organizations

### Commercial Use Includes:
- Integration into products/services that are sold
- Use in for-profit company operations
- Paid consulting/support services

For commercial licensing inquiries, contact: **jesust07@gmail.com**

See the [LICENSE](LICENSE) file for full details.

---

## 👤 Author

**JESUS ALBERTO TORRES VELASQUEZ**

---

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All tests pass
- Code follows ESLint rules
- JSDoc comments are complete
- New features include tests

---

## 📞 Support

For issues, questions, or commercial licensing:
- Email: jesust07@gmail.com
- Create an issue on GitHub

---

**Built with ❤️ using TypeScript, Express, MongoDB, Zod, and Winston**

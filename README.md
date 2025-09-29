# CRUD API REST Framework (CrudApiBuilder)

A lightweight TypeScript micro‑framework that generates **productive CRUD APIs** on top of **Express + MongoDB**, with **runtime validation** powered by **Zod**, and a clean layered architecture: Repository → Service → Controller → Router.

> Goal: spin up a fully working REST API with minimal boilerplate (entity + schema + collection) and best practices built‑in.

---

## ✨ Features

- **Full CRUD** (Create/Read/Update/Delete and Find) generated from a Zod schema.
- **Centralized validation** middleware for `POST`, `PATCH`, and `GET` (filters).
- **Unique field constraints** with MongoDB unique indexes and duplicate handling.
- **Layered architecture** with generics: domain, repository, service, controller.
- **Express router ready** to mount or **standalone server** with one call.
- **Logger** (Winston) with daily log rotation.

---

## 🧱 High‑Level Architecture

- **Repository (MongoDbRepository)**: direct MongoDB CRUD + unique indexes.
- **Service (CrudService)**: orchestrates repository, exposes domain API.
- **Controller (CrudController)**: Express handlers calling the service.
- **Router**: maps endpoints and applies **validationMiddleware** (Zod).
- **SchemaBuilder** (optional): declarative way to build Zod schemas.

---

## 🔧 Requirements

- Node.js 18+
- MongoDB 6+

---

## 🚀 Quick Start (standalone server)

```ts
import { buildSchema } from "./src/infrastructure/tools/schemabuilder";
import { ApiBuilder } from "./src/infrastructure/http/apibuilder";

const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});

type Product = { name: string; price: number };

(async () => {
  const builder = new ApiBuilder<Product>({
    mongoUri: "mongodb://localhost:27017",
    dbName: "mydb",
    collection: "products",
    schema: ProductSchema,
    port: 5000,
    uniqueFields: ["name"],
  });

  await builder.buildServer();
})();
```

- API available at: `http://localhost:5000/products`

### Example Generated Endpoints

```
POST   /products         -> create (validates body against Zod schema)
GET    /products/:id     -> read by id
PATCH  /products/:id     -> update (validates partial body)
DELETE /products/:id     -> delete
GET    /products         -> list / filter (validates query params)
```

### Example Usage (fetch/cURL)

```bash
# Create
curl -X POST http://localhost:5000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":1200}'

# List all
curl http://localhost:5000/products

# Filter by name
curl "http://localhost:5000/products?name=Laptop"

# Update
curl -X PATCH http://localhost:5000/products/<id> \
  -H "Content-Type: application/json" \
  -d '{"price":999}'

# Delete
curl -X DELETE http://localhost:5000/products/<id>
```

> You can also run `src/test.js` to see a complete flow of requests.

---

## 🧪 Validation & Typing

- **Zod** validates **body** and **query**. For `GET /products`, the middleware attempts to **coerce** strings to `number`/`boolean` where possible (e.g. `?price=10` → number).
- For **create**, the full schema is required. For **update/find**, a partial schema is applied.

### Optional: Declarative Schema Builder

```ts
const ProductSchema = buildSchema({
  name: { type: "string", min: 1 },
  price: { type: "number", min: 0 },
});
```

> If you prefer **raw Zod**, you can provide that directly as well.

---

## 🔒 Unique Fields & Indexes

You can declare unique fields per entity:

```ts
uniqueFields: ["name"];
```

- On initialization, the repository creates **unique indexes** for these fields.
- On `create`/`update`, duplicates are checked and reported clearly.

---

## 🪵 Logging

- A **WinstonLogger** is provided with daily/automatic log rotation.
- In development mode, it adds a `debug` channel.

> Suggested: integrate request logging middleware and reuse logger in controllers/error handling.

---

## 📂 Project Structure

```
src/
  application/        # Application services (CrudService)
  domain/             # Domain types & contracts (Repository, Query, MongoDocument)
  infrastructure/
    http/             # ApiBuilder, Controller, Router, Middleware (Zod)
    persistance/      # MongoDbRepository (indexes, CRUD, duplicates)
    logger/           # Winston logger
    tools/schemabuilder/  # Declarative schema builder for Zod
  examples/              # Usage examples and integration tests
```

---

## 🧭 Roadmap (ideas)

- Generate **OpenAPI/Swagger** from Zod schemas.
- Add E2E tests with **Supertest**.

---

## 🛠 Development

1. Start MongoDB locally.
2. Install dependencies: `npm i`
3. Demo server: `npx ts-node src/tests/02_test_server.ts`
4. Demo router (mount in custom app): `npx ts-node src/tests/02_test_router.ts`
5. Repo demo: `npx ts-node src/tests/01_mongorepo.ts`

> Adjust URIs/ports as needed.

---

## License

MIT

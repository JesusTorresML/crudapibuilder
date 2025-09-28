/**
 * Integration test for MongoDbRepository<User>
 *
 * This test script demonstrates basic CRUD operations
 * and unique constraint handling.
 *
 * Run:  ts-node src/tests/01_mongorepo.ts
 */

import { MongoClient } from "mongodb";
import { MongoDbRepository } from "../infrastructure/persistance/mongorepo.js";
import type { MongoDocument } from "#root/domain/models/mongodocument.js";
import { WinstonLogger } from "#root/infrastructure/logger/winston.logger.js";

/**
 * User domain entity
 */
export interface User {
  username: string;
  email: string;
  password: string;
}

/**
 *
 */
async function run(): Promise<void> {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    // 1. Connect to MongoDB
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const logger: WinstonLogger = new WinstonLogger();

    // 2. Initialize repository
    const userRepo = new MongoDbRepository<User>(
      client,
      "test_mongorepo", // database
      "users", // collection
      ["email", "username"],
      logger,
    );

    // 3. Ensure collection + indexes
    await userRepo.initCollections();
    console.log("✅ Collections initialized");

    // 4. Create a new user
    const u1 = await userRepo.create({
      username: "jdoe",
      email: "jdoe@mail.com",
      password: "1234",
    });
    console.log("Created:", u1);

    // 5. Try to create a duplicate user (should return null)
    const u2 = await userRepo.create({
      username: "other",
      email: "jdoe@mail.com",
      password: "abcd",
    });
    console.log("Duplicate create (expected null):", u2);

    // 6. Update user (try invalid and valid IDs)
    const updatedInvalid = await userRepo.update(
      "INVALID_ID", // invalid ObjectId string
      { username: "johnny" },
    );
    console.log("Update with invalid id (expected null):", updatedInvalid);

    if (u1) {
      const userFind: MongoDocument<User> | null =
        await userRepo.findByUniqueField("email", "jdoe@mail.com");

      if (userFind !== null) {
        const updatedValid = await userRepo.update(userFind._id, {
          password: "newpass",
        });
        console.log("Update with valid id:", updatedValid);
      }
    }

    // 7. Query by unique field
    const found = await userRepo.findByUniqueField("email", "jdoe@mail.com");
    console.log("Found by email:", found);

    // 8. Delete user
    if (u1) {
      // ⚠️ The repository returns plain domain entity without _id.
      // For demo, we re-fetch the user to get the id.
      const existing = await userRepo.findByUniqueField(
        "email",
        "jdoe@mail.com",
      );
      if (existing?._id) {
        await userRepo.remove(existing._id.toString());
        console.log("✅ User removed");
      }
    }
  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    await client.close();
    console.log("🔒 Connection closed");
  }
}

run();

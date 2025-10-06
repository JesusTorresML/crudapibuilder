/**
 * Integration test for MongoDbRepository<User>
 *
 * This test script demonstrates basic CRUD operations
 * and unique constraint handling with proper logging.
 *
 * Run:  npx ts-node src/examples/01_mongorepo.ts
 */

import { MongoClient } from "mongodb";
import { MongoDbRepository } from "../../infrastructure/persistance/mongorepo.js";
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
 * Main test execution function
 * @returns {Promise<void>}
 */
async function run(): Promise<void> {
  const logger = new WinstonLogger();
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    // 1. Connect to MongoDB
    await client.connect();
    logger.info("Connected to MongoDB successfully");

    // 2. Initialize repository with unique fields
    const userRepo = new MongoDbRepository<User>(
      client,
      "testdb_mongorepo",
      "users",
      ["email", "username"],
      logger,
    );

    // 3. Ensure collection and indexes exist
    const isNewCollection = await userRepo.initCollections();
    logger.info(`Collection initialized (new: ${isNewCollection})`);

    // 4. Test: Create a new user
    logger.info("TEST 1: Creating new user");
    const u1 = await userRepo.create({
      username: "jdoe",
      email: "jdoe@mail.com",
      password: "1234",
    });

    if (u1) {
      logger.info("User created successfully", {
        id: u1._id.toString(),
        username: u1.username,
        email: u1.email,
      });
    } else {
      logger.warn("User creation returned null");
    }

    // 5. Test: Try to create a duplicate user (should return null)
    logger.info("TEST 2: Attempting to create duplicate user");
    const u2 = await userRepo.create({
      username: "other",
      email: "jdoe@mail.com", // duplicate email
      password: "abcd",
    });

    if (u2 === null) {
      logger.info("Duplicate detection working correctly (returned null)");
    } else {
      logger.error("Duplicate detection failed - should have returned null");
    }

    // 6. Test: Update with invalid ID
    logger.info("TEST 3: Attempting update with invalid ID");
    try {
      const updatedInvalid = await userRepo.update("INVALID_ID", {
        username: "johnny",
      });
      logger.warn("Update with invalid ID returned:", {
        result: updatedInvalid,
      });
    } catch (error) {
      logger.info("Invalid ID correctly rejected", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 7. Test: Update with valid ID
    if (u1) {
      logger.info("TEST 4: Finding and updating user");
      const userFind: MongoDocument<User> | null = await userRepo.findOne({
        email: "jdoe@mail.com",
      });

      if (userFind !== null) {
        logger.info("User found for update", { id: userFind._id.toString() });

        const updatedValid = await userRepo.update(userFind._id, {
          password: "newpass",
        });

        if (updatedValid) {
          logger.info("User updated successfully", {
            id: updatedValid._id.toString(),
            hasNewPassword: updatedValid.password === "newpass",
          });
        }
      }
    }

    // 8. Test: Query by unique field with pagination
    logger.info("TEST 5: Finding users by email");
    const found = await userRepo.find(
      { email: "jdoe@mail.com" },
      { skip: 0, limit: 10 },
    );
    logger.info("Find operation completed", {
      foundCount: found.data.length,
      total: found.total,
    });

    // 9. Test: Count users
    logger.info("TEST 6: Counting users");
    const count = await userRepo.count({ email: "jdoe@mail.com" });
    logger.info(`Total users with email 'jdoe@mail.com': ${count}`);

    // 10. Test: Delete user
    if (u1) {
      logger.info("TEST 7: Deleting user");
      const existing = await userRepo.findOne({ email: "jdoe@mail.com" });

      if (existing?._id) {
        const deleted = await userRepo.remove(existing._id.toString());

        if (deleted) {
          logger.info("User removed successfully", {
            id: existing._id.toString(),
          });
        } else {
          logger.warn("User removal returned false");
        }
      }
    }

    // 11. Test: Verify deletion
    logger.info("TEST 8: Verifying user deletion");
    const verifyDeleted = await userRepo.findOne({ email: "jdoe@mail.com" });

    if (verifyDeleted === null) {
      logger.info("Deletion verified - user no longer exists");
    } else {
      logger.error("Deletion failed - user still exists");
    }

    logger.info("All tests completed successfully");
  } catch (err) {
    logger.error("Test execution failed", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  } finally {
    await client.close();
    logger.info("MongoDB connection closed");
  }
}

// Execute tests
run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

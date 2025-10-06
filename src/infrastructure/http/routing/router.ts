import { Router } from "express";
import type { CrudController } from "./controller.js";
import type { ZodObject, ZodType } from "zod";

import { validationMiddleware } from "../middlewares/datavalidator.js";

/**
 * Generic CRUD Router.
 * @param {CrudController<T>} controller - Crud Controller
 * @param {ZodObject<Record<string, ZodType>>} schema - Zod Schema.
 * @returns {Router} Express router with CRUD endpoints
 */
export function createCrudRouter<T>(
  controller: CrudController<T>,
  schema: ZodObject<Record<string, ZodType>>,
): Router {
  const router: Router = Router();

  // Create
  router.post(
    "/",
    validationMiddleware<T>(schema, {
      allowUnknownFields: false,
      strictMode: false,
    }),
    controller.create.bind(controller),
  );

  // Read by ID
  router.get("/:id", controller.read.bind(controller));

  // Update
  router.patch(
    "/:id",
    validationMiddleware<T>(schema),
    controller.update.bind(controller),
  );

  // Delete
  router.delete("/:id", controller.remove.bind(controller));

  // Find
  router.get(
    "/",
    validationMiddleware<T>(schema),
    controller.find.bind(controller),
  );

  return router;
}

import { Router } from "express";
import type { CrudController } from "./controller";
import type { ZodObject } from "zod";
import { validationMiddleware } from "./middleware.js";

/**
 *
 * @param controller
 * @param schema
 */
export function createCrudRouter<T>(
  controller: CrudController<T>,
  schema: ZodObject<any>,
): Router {
  const router: Router = Router();

  // Create
  router.post(
    "/",
    validationMiddleware<T>(schema),
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

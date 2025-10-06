import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { SwaggerGenerator } from "./generator.js";

import type { SwaggerMiddlewareConfig } from "./types.js";

/**
 * Creates Swagger documentation middleware using swagger-ui-express
 *
 * IMPORTANT: Each call creates an ISOLATED Swagger UI instance with its own spec
 * This prevents caching issues when serving multiple APIs
 * @param {SwaggerMiddlewareConfig} config - Swagger config.
 * @returns {Router} - Express Router.
 */
export function createSwaggerMiddleware(
  config: SwaggerMiddlewareConfig,
): Router {
  const router = Router();
  const swaggerPath = config.path || "/swagger";

  // Generate OpenAPI spec using swagger-jsdoc
  const generator = new SwaggerGenerator({
    title: config.title,
    description: config.description,
    version: config.version,
    basePath: config.basePath,
    resourceName: config.resourceName,
    serverUrl: config.serverUrl,
    schema: config.schema,
    uniqueFields: config.uniqueFields,
  });

  const swaggerOptions = generator.generateSwaggerOptions();
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Custom CSS for better appearance
  const customCss =
    config.customCss ||
    `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 36px; }
  `;

  const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    customCss,
    customSiteTitle: config.customSiteTitle || `${config.title} - API Docs`,
    swaggerOptions: {
      docExpansion: "list",
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      ...config.swaggerUiOptions,
    },
  };

  // CRITICAL: Serve OpenAPI JSON FIRST before UI
  // This ensures each spec is unique and not cached
  router.get(`${swaggerPath}.json`, (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(swaggerSpec);
  });

  // CRITICAL: Use swaggerUi.setup with a FUNCTION that returns the spec
  // This creates a new instance for each request and prevents caching
  router.use(
    swaggerPath,
    swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions),
    swaggerUi.setup(swaggerSpec, swaggerUiOptions, {
      // Force no caching
      swaggerOptions: {
        url: `${swaggerPath}.json`, // Point to our JSON endpoint
        ...swaggerUiOptions.swaggerOptions,
      },
    }),
  );

  return router;
}

/**
 * Get swagger spec without setting up routes (useful for testing)
 * @param {SwaggerMiddlewareConfig} config - Swagger Middleware config.
 * @returns {object} - Swagger object data.
 */
export function generateSwaggerSpec(config: SwaggerMiddlewareConfig): object {
  const generator: SwaggerGenerator<any> = new SwaggerGenerator({
    title: config.title,
    description: config.description,
    version: config.version,
    basePath: config.basePath,
    resourceName: config.resourceName,
    serverUrl: config.serverUrl,
    schema: config.schema,
    uniqueFields: config.uniqueFields,
  });

  const swaggerOptions = generator.generateSwaggerOptions();
  return swaggerJsdoc(swaggerOptions);
}

/**
 * Alternative approach: Create completely isolated Swagger instances
 * Use this if you still have caching issues
 * @param {SwaggerMiddlewareConfig} config - Middleware Configuration.
 * @returns {Router} - Express router.
 */
export function createIsolatedSwaggerMiddleware(
  config: SwaggerMiddlewareConfig,
): Router {
  const router = Router();
  const swaggerPath = config.path || "/docs";

  // Generate unique spec
  const generator = new SwaggerGenerator({
    title: config.title,
    description: config.description,
    version: config.version,
    basePath: config.basePath,
    resourceName: config.resourceName,
    serverUrl: config.serverUrl,
    schema: config.schema,
    uniqueFields: config.uniqueFields,
  });

  const swaggerOptions = generator.generateSwaggerOptions();
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Serve JSON spec
  router.get(`${swaggerPath}.json`, (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(swaggerSpec);
  });

  // Custom CSS
  const customCss =
    config.customCss ||
    `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 36px; }
  `;

  // Serve Swagger UI with explicit spec
  const setupOptions = {
    customCss,
    customSiteTitle: config.customSiteTitle || `${config.title} - API Docs`,
    swaggerOptions: {
      url: `${swaggerPath}.json`, // CRITICAL: Point to unique JSON endpoint
      docExpansion: "list",
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      filter: true,
      ...config.swaggerUiOptions,
    },
  };

  // Use serve and setup separately for better control
  router.use(swaggerPath, swaggerUi.serve);
  router.get(swaggerPath, swaggerUi.setup(swaggerSpec, setupOptions));

  return router;
}

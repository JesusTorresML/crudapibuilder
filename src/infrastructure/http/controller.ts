import type { Request, Response, NextFunction } from "express";
import type { IService } from "#root/domain/crudservice.interface.js";
import type { Logger, MongoDocument } from "#root/domain/index.js";
import { ValidationError } from "#root/config/errors.js";
import type { PaginationOptions } from "#root/domain/index.js";

/**
 * Enhanced CRUD controller that handles HTTP requests and responses.
 * All errors are properly delegated to the global error handler via next().
 *
 * @template TEntity - The domain entity type
 * @template TQuery - The query type for filtering operations
 */
export class CrudController<TEntity> {
  /**
   * Creates a new CRUD controller instance with service dependency injection.
   *
   * @param {IService<TEntity, TQuery>} service - Service layer for business logic operations
   * @param {Logger} logger - Logger instance for request/response tracking
   */
  public constructor(
    private readonly service: IService<TEntity>,
    private readonly logger: Logger,
  ) {}

  /**
   * Handles HTTP POST requests for entity creation.
   * Validates request body, creates entity, and returns formatted response.
   * All errors are passed to the global error handler via next().
   *
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function for error handling
   * @returns {Promise<void>} Resolves when response is sent or error is passed to next()
   */
  public async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      this.logger.debug("Controller: Processing create request", {
        method: req.method,
        path: req.path,
        userAgent: req.get("User-Agent"),
      });

      // Extract validated data from middleware
      const entityData = res.locals.createDto as TEntity;

      if (!entityData) {
        throw new ValidationError({
          message: "Request body is required for entity creation",
          field: "body",
          violations: ["Request body cannot be empty"],
        });
      }

      const createdEntity: MongoDocument<TEntity> | null =
        await this.service.create(entityData);

      if (!createdEntity) {
        res.status(201).json({
          success: false,
          data: null,
          message: "Creation of Document for entity failed",
        });
        return;
      }

      const response = {
        success: true,
        message: "Entity created successfully",
        data: createdEntity,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("Controller: Create operation successful", {
        entityId: createdEntity._id,
        statusCode: 201,
      });

      res.status(201).json(response);
    } catch (error) {
      // Log the error context but don't handle the response here
      this.logger.error("Controller: Create operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.path,
        method: req.method,
      });

      // Pass error to global error handler
      next(error);
    }
  }

  /**
   * Handles HTTP GET requests for retrieving a single entity by ID.
   * Validates ID parameter, retrieves entity, and returns formatted response.
   * All errors are passed to the global error handler via next().
   *
   * @param {Request} req - Express request object containing entity ID
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function for error handling
   * @returns {Promise<void>} Resolves when response is sent or error is passed to next()
   */
  public async read(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      this.logger.debug("Controller: Processing read request", {
        entityId: id,
        method: req.method,
        path: req.path,
      });

      if (!id || typeof id !== "string") {
        throw new ValidationError({
          message: "Valid entity ID is required",
          field: "id",
          violations: ["ID parameter must be a valid string"],
        });
      }

      const entity = await this.service.read(id);

      const response = {
        success: true,
        message: "Entity retrieved successfully",
        data: entity,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("Controller: Read operation successful", {
        entityId: entity._id,
        statusCode: 200,
      });

      res.status(200).json(response);
    } catch (error) {
      this.logger.error("Controller: Read operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        entityId: req.params["id"],
        method: req.method,
      });

      // Pass error to global error handler
      next(error);
    }
  }

  /**
   * Handles HTTP PATCH requests for updating existing entities.
   * Validates ID and update data, performs update, and returns formatted response.
   * All errors are passed to the global error handler via next().
   *
   * @param {Request} req - Express request object containing ID and update data
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function for error handling
   * @returns {Promise<void>} Resolves when response is sent or error is passed to next()
   */
  public async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = res.locals.updateDto as Partial<TEntity>;

      this.logger.debug("Controller: Processing update request", {
        entityId: id,
        method: req.method,
        path: req.path,
        hasUpdateData: !!updateData,
      });

      if (!id || typeof id !== "string") {
        throw new ValidationError({
          message: "Valid entity ID is required",
          field: "id",
          violations: ["ID parameter must be a valid string"],
        });
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new ValidationError({
          message: "Update data is required",
          field: "body",
          violations: [
            "Request body must contain at least one field to update",
          ],
        });
      }

      const updatedEntity = await this.service.update(id, updateData);

      const response = {
        success: true,
        message: "Entity updated successfully",
        data: updatedEntity,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("Controller: Update operation successful", {
        entityId: updatedEntity._id,
        statusCode: 200,
      });

      res.status(200).json(response);
    } catch (error) {
      this.logger.error("Controller: Update operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        entityId: req.params["id"],
        method: req.method,
      });

      // Pass error to global error handler
      next(error);
    }
  }

  /**
   * Handles HTTP DELETE requests for removing entities.
   * Validates ID parameter, removes entity, and returns confirmation response.
   * All errors are passed to the global error handler via next().
   *
   * @param {Request} req - Express request object containing entity ID
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function for error handling
   * @returns {Promise<void>} Resolves when response is sent or error is passed to next()
   */
  public async remove(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      this.logger.debug("Controller: Processing remove request", {
        entityId: id,
        method: req.method,
        path: req.path,
      });

      if (!id || typeof id !== "string") {
        throw new ValidationError({
          message: "Valid entity ID is required",
          field: "id",
          violations: ["ID parameter must be a valid string"],
        });
      }

      await this.service.remove(id);

      const response = {
        success: true,
        message: "Entity removed successfully",
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("Controller: Remove operation successful", {
        entityId: id,
        statusCode: 201,
      });

      res.status(201).json(response);
    } catch (error) {
      this.logger.error("Controller: Remove operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        entityId: req.params["id"],
        method: req.method,
      });

      // Pass error to global error handler
      next(error);
    }
  }

  /**
   * Handles HTTP GET requests for finding entities with query filters and pagination.
   * Validates query parameters, executes search, and returns paginated results.
   * All errors are passed to the global error handler via next().
   *
   * @param {Request} req - Express request object containing query parameters
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next middleware function for error handling
   * @returns {Promise<void>} Resolves when response is sent or error is passed to next()
   */
  public async find(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const queryFilters = res.locals.findDto as Partial<TEntity>;

      // Extract pagination parameters from query string
      const paginationOptions: PaginationOptions = {
        skip: parseInt(req.query["skip"] as string) || 0,
        limit: Math.min(parseInt(req.query["limit"] as string) || 50, 100), // Cap at 100
        sortBy: (req.query["sortBy"] as string) || "createdAt",
        sortOrder: (req.query["sortOrder"] as string) === "desc" ? -1 : 1,
      };

      this.logger.debug("Controller: Processing find request", {
        method: req.method,
        path: req.path,
        queryFilters,
        paginationOptions,
      });

      // Validate pagination parameters
      if (Number(paginationOptions.skip) < 0) {
        throw new ValidationError({
          message: "Skip parameter must be non-negative",
          field: "skip",
          violations: ["Skip value cannot be negative"],
        });
      }

      if (Number(paginationOptions.limit) <= 0) {
        throw new ValidationError({
          message: "Limit parameter must be positive",
          field: "limit",
          violations: ["Limit value must be greater than 0"],
        });
      }

      const result = await this.service.find(queryFilters, paginationOptions);

      const response = {
        success: true,
        message: "Entities retrieved successfully",
        data: result.data,
        pagination: {
          skip: result.skip,
          limit: result.limit,
          total: result.total,
          hasNext: result.hasNext,
          hasPrevious: result.hasPrevious,
          currentPage: Math.floor(result.skip / result.limit) + 1,
          totalPages: Math.ceil(result.total / result.limit),
        },
        timestamp: new Date().toISOString(),
      };

      this.logger.debug("Controller: Find operation successful", {
        resultCount: result.data.length,
        totalCount: result.total,
        statusCode: 200,
      });

      res.status(200).json(response);
    } catch (error) {
      this.logger.error("Controller: Find operation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.path,
        method: req.method,
      });

      // Pass error to global error handler
      next(error);
    }
  }
}

import type { Request, Response, NextFunction } from "express";
import type { IService } from "#root/domain/crudservice.interface.js";

/**
 *
 */
export class CrudController<T> {
  /**
   * Creates an instance of UsersController.
   * @param {CrudService} crudService - The application service for user operations.
   */
  public constructor(private readonly crudService: IService<T>) {}

  /**
   *
   * @param _req
   * @param res
   * @param next
   */
  public async create(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const created = await this.crudService.create(res.locals.createDto);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public async read(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id = "" } = req.params;
      const entity = await this.crudService.read(id);
      if (!entity) {
        res.status(404).json({ error: "Entity not found" });
      } else {
        res.json(entity);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id = "" } = req.params;
      const updated = await this.crudService.update(id, res.locals.updateDto);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public async remove(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id = "" } = req.params;
      await this.crudService.remove(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  public async find(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const filters = res.locals.findDto as Partial<T>;
      const entities = await this.crudService.find(filters);
      res.json(entities);
    } catch (error) {
      next(error);
    }
  }
}

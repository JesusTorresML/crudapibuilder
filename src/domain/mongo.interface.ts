import type { DeleteResult } from "mongodb";

/**
 * @type {Query<E>}
 * @description A generic query object type based on the partial shape of a domain entity.
 */
export type Query<E> = Partial<E>;

/**
 * @interface IRepository
 * @description A generic, persistence-agnostic interface for a repository.
 * @template E - The type of the Domain Entity.
 */
export interface IRepository<T> {
  create(data: T): Promise<T | null>;
  read(id: string): Promise<T | null>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<DeleteResult>;
  find(query: Query<T>): Promise<T[]>;
  findOne(query: Query<T>): Promise<T | null>;
}

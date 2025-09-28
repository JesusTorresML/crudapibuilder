import type { DeleteResult } from "mongodb";
import type { MongoDocument } from "./models/mongodocument";

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
  create(data: T): Promise<MongoDocument<T> | null>;
  read(id: string): Promise<MongoDocument<T> | null>;
  update(id: string, data: Partial<T>): Promise<MongoDocument<T> | null>;
  remove(id: string): Promise<DeleteResult>;
  find(query: Query<T>): Promise<MongoDocument<T>[]>;
  findOne(query: Query<T>): Promise<MongoDocument<T> | null>;
}

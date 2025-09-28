import type { MongoDocument } from "./models/mongodocument.js";
import type { DeleteResult } from "mongodb";
import type { Query } from "./mongo.interface.js";

export interface IService<T> {
  create(data: T): Promise<MongoDocument<T> | null>;
  read(id: string): Promise<MongoDocument<T> | null>;
  update(id: string, data: Partial<T>): Promise<MongoDocument<T> | null>;
  remove(id: string): Promise<DeleteResult>;
  find(query: Query<T>): Promise<MongoDocument<T>[]>;
  findOne(query: Query<T>): Promise<MongoDocument<T> | null>;
}

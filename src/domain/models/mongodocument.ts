import type { ObjectId } from "mongodb";

export type MongoDocument<TEntity> = TEntity & {
  _id: ObjectId;
  createdAt: Date;
};

export type InputDocument<T> = Omit<MongoDocument<T>, "_id" | "createdAt">;

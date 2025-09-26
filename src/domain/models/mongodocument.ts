import type { ObjectId } from "mongodb";

export type MongoDocument<T> = T & {
  _id: ObjectId;
  createdAt: Date;
};

export type InputDocument<T> = Omit<MongoDocument<T>, "_id" | "createdAt">;

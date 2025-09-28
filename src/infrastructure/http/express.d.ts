declare global {
  namespace Express {
    interface Locals {
      createDto: T;
      updateDto: Partial<T>;
      findDto: Partial<T>;
    }
  }
}
export {};

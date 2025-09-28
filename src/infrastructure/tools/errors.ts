/* eslint-disable @typescript-eslint/no-explicit-any */
export type ErrorName = "CONFIG_ERROR" | "TypeError" | "Error" | "SERVER_ERROR";

/**
 *
 */
export class CustomError extends Error {
  public override name: ErrorName;
  public override message: string;
  public override cause: any;

  /**
   * Constructs a new instance of `CustomError`.
   * @param {object} params - An object containing the error properties.
   * @param {ErrorName} params.name - The name of the predefined error.
   * @param {string} params.message - A descriptive message for the error.
   * @param {any} params.cause - The cause of the error, providing additional context.
   */
  public constructor(params: { name: ErrorName; message: string; cause: any }) {
    super();
    this.name = params.name;
    this.message = params.message;
    this.cause = params.cause;
  }
}

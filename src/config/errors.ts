/**
 * Enumeration of application-specific error types for better error categorization
 * and handling throughout the application.
 */
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  DUPLICATE_ERROR = "DUPLICATE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  CONFIG_ERROR = "CONFIG_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
}

/**
 * Base application error class that provides consistent error structure
 * across the entire application with proper typing and metadata support.
 *
 * @class ApplicationError
 * @extends {Error}
 */
export class ApplicationError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly metadata?: Record<string, unknown>;
  public readonly timestamp: Date;

  /**
   * Creates a new ApplicationError instance with comprehensive error information.
   *
   * @param {Object} params - Error configuration parameters
   * @param {ErrorType} params.type - The specific type of error for categorization
   * @param {string} params.message - Human-readable error description
   * @param {number} [params.statusCode=500] - HTTP status code associated with the error
   * @param {Record<string, unknown>} [params.metadata] - Additional error context data
   * @param {Error} [params.cause] - The underlying error that caused this error
   */
  public constructor({
    type,
    message,
    statusCode = 500,
    metadata,
    cause,
  }: {
    type: ErrorType;
    message: string;
    statusCode?: number;
    metadata?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(message);
    this.name = "ApplicationError";
    this.type = type;
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.timestamp = new Date();
    this.cause = cause;

    // Maintains proper stack trace for debugging purposes
    Error.captureStackTrace(this, ApplicationError);
  }
}

/**
 * Specialized error for validation failures with field-specific details.
 * Extends ApplicationError to provide validation-specific error handling.
 *
 * @class ValidationError
 * @extends {ApplicationError}
 */
export class ValidationError extends ApplicationError {
  public readonly field?: string;
  public readonly violations: string[];

  /**
   * Creates a validation error with specific field and violation details.
   *
   * @param {Object} params - Validation error parameters
   * @param {string} params.message - General validation error message
   * @param {string} [params.field] - The specific field that failed validation
   * @param {string[]} [params.violations=[]] - Array of specific validation violations
   * @param {Record<string, unknown>} [params.metadata] - Additional validation context
   */
  public constructor({
    message,
    field,
    violations = [],
    metadata,
  }: {
    message: string;
    field?: string;
    violations?: string[];
    metadata?: Record<string, unknown>;
  }) {
    super({
      type: ErrorType.VALIDATION_ERROR,
      message,
      statusCode: 400,
      metadata: { ...metadata, field, violations },
    });
    this.field = field;
    this.violations = violations;
  }
}

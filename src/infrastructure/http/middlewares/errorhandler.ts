import type { Request, Response, NextFunction } from "express";
import { WinstonLogger } from "../../logger/index.js";
import { ErrorType, ValidationError } from "#root/config/errors.js";
import { ApplicationError } from "#root/config/errors.js";
import { MongoServerError } from "mongodb";
/**
 * Centralized error handling middleware that processes all application errors
 * and converts them to appropriate HTTP responses with consistent formatting.
 *
 * @param {Error} error - The error instance to be processed and handled
 * @param {Request} req - Express request object for context
 * @param {Response} res - Express response object for sending error response
 * @param {NextFunction} _next - Express next function for middleware chaining
 */
export function globalErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log error details for monitoring and debugging purposes
  const logger = new WinstonLogger();
  logger.error("Global error handler caught error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle ApplicationError instances with specific formatting
  if (error instanceof ApplicationError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        type: error.type,
        message: error.message,
        timestamp: error.timestamp,
        ...(error.metadata && { details: error.metadata }),
      },
    });
    return;
  }

  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        type: error.type,
        message: error.message,
        timestamp: error.timestamp,
        ...(error.metadata && { details: error.metadata }),
      },
    });
    return;
  }

  // Handle MongoDB duplicate key errors
  if (error instanceof MongoServerError && error.code === 11000) {
    res.status(409).json({
      success: false,
      error: {
        type: ErrorType.DUPLICATE_ERROR,
        message: "Duplicate value detected",
        timestamp: new Date(),
        details: { duplicateField: extractDuplicateField(error.message) },
      },
    });
    return;
  }

  // Default error handling for unrecognized errors
  res.status(500).json({
    success: false,
    error: {
      type: ErrorType.SERVER_ERROR,
      message: "Internal server error occurred",
      timestamp: new Date(),
    },
  });
}

/**
 * Extracts the field name that caused a MongoDB duplicate key error
 * from the error message using regex pattern matching.
 *
 * @param {string} errorMessage - MongoDB error message containing duplicate key info
 * @returns {string} The field name that caused the duplicate error
 */
function extractDuplicateField(errorMessage: string): string {
  const match = errorMessage.match(/index:\s+([^\s]+)/);
  return match?.[1] ?? "unknown_field";
}

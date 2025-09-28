/* eslint-disable @typescript-eslint/no-explicit-any */

import winston from "winston";
import path from "path";
import DailyRotateFile from "winston-daily-rotate-file";
import type { Logger } from "../../domain/logger.interface.js";

/**
 * @class WinstonLogger
 * @implements {Logger}
 * @description An adapter that implements the generic `Logger` interface using 'winston'.
 * It is configured with daily log rotation to prevent log files from growing indefinitely.
 */
export class WinstonLogger implements Logger {
  private readonly logger: winston.Logger;

  /**
   *
   */
  public constructor() {
    const logFormat = winston.format.printf(
      ({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
        return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${metaString}`;
      },
    );

    const transports: winston.transport[] = [
      new DailyRotateFile({
        level: "error",
        filename: path.join(process.cwd(), "logs", "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "14d",
      }),

      new DailyRotateFile({
        level: "info", // Capture info, warn, error
        filename: path.join(process.cwd(), "logs", "combined-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "50m",
        maxFiles: "7d",
      }),
    ];

    if (process.env["NODE_ENV"] === "development") {
      transports.push(
        new DailyRotateFile({
          level: "debug",
          filename: path.join(process.cwd(), "logs", "debug-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          zippedArchive: false,
          maxSize: "20m",
          maxFiles: "3d", // Keep only 3 days
        }),
      );
    }

    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        logFormat,
      ),
      transports: transports,
    });

    if (process.env["NODE_ENV"] !== "test") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
          level: "info",
        }),
      );
    }
  }

  /**
   *
   */
  public info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }
  /**
   *
   */
  public warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }
  /**
   *
   */
  public error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }
  /**
   *
   */
  public debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }
}

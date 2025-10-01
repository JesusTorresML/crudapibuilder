import { CustomError } from "../tools/errors.js";
import type { CorsOptions } from "cors";

/**
 * Configure corsOptions from allowed Origins.
 * @param {string[]} allowedOrigins - Array of allowed origin URLs
 * @returns {CorsOptions} - CorsOptions.
 */
export function checkCorsOptions(allowedOrigins: string[]): CorsOptions {
  return {
    /**
     *
     * @param {string} origin - Origin.
     * @param {CallableFunction} callback - Callback.
     */
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, success?: boolean) => void,
    ): void => {
      if (!origin) {
        callback(null, true);
      } else if (!allowedOrigins.includes(origin)) {
        callback(
          new CustomError({
            name: "CONFIG_ERROR",
            message: "Forbidden: invalid Origin",
            cause: `Origin '${origin}' not in allowed origins: ${allowedOrigins.join(", ")}`,
          }),
        );
      } else {
        callback(null, true);
      }
    },

    /**
     * Allowed HTTP methods for CORS requests.
     */
    methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],

    /**
     * Indicates whether credentials (such as cookies or authentication headers)
     * are allowed in CORS requests.
     */
    credentials: true,

    /**
     * The allowed headers for CORS requests.
     */
    allowedHeaders: ["Accept", "Content-Type", "Authorization"],
  };
}

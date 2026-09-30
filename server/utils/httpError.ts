import type { HttpStatus } from "../constants.js";

// Throw this for expected failures ("cart is empty", "out of stock").
// The central errorHandler turns it into the right status + JSON body.
// Throwing (instead of res.status().json()) matters inside withTransaction:
// the throw triggers ROLLBACK, so a half-finished order is never saved.
export class HttpError extends Error {
  status: HttpStatus;
  details?: unknown;

  constructor(status: HttpStatus, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

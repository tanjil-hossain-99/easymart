import { Request, Response, NextFunction } from "express"
import { HttpStatus, PgErrorCode } from "../constants.js"
import { HttpError } from "../utils/httpError.js"

export function errorHandler(
  err: Error & { code?: string },
  req: Request,
  res: Response,
  _next: NextFunction // Express only treats a middleware as an error handler if it has 4 params
) {
  // Expected failures thrown on purpose by route code
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details })
    return
  }

  // e.g. "abc" passed where a UUID is expected — the client's mistake, not a server failure
  if (err.code === PgErrorCode.InvalidTextRepresentation) {
    res.status(HttpStatus.BadRequest).json({ error: "Invalid id format" })
    return
  }

  console.error(`[Error] ${req.method} ${req.path}:`, err.message)

  res.status(HttpStatus.InternalServerError).json({
    error: err.message || "Internal server error",
  })
}

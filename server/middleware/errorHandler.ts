import { Request, Response, NextFunction } from "express"

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message)

  res.status(500).json({
    error: err.message || "Internal server error",
  })
}

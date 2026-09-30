import { Request, Response, NextFunction } from "express"

export function logger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on("finish", () => {
    const duration = Date.now() - start
    // originalUrl, not path: inside a mounted router req.path is relative ("/items" instead of "/cart/items")
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`)
  })

  next()
}

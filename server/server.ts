import cors from "cors"
import "dotenv/config"
import express, { Request, Response } from "express"
import pool from "./db/pool.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { logger } from "./middleware/logger.js"
import productsRouter from "./routes/products.js"
import categoriesRouter from "./routes/categories.js"

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(logger)

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "EasyMart API" })
})

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW() as time")
    res.json({ db: "ok", time: result.rows[0].time })
  } catch (err) {
    res.status(500).json({ db: "error" })
  }
})

app.use("/products", productsRouter)
app.use("/categories", categoriesRouter)

// Error handler — must be last
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})

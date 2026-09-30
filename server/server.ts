import cors from "cors";
import express, { Request, Response } from "express";
import { env } from "./config/env.js";
import { HttpStatus } from "./constants.js";
import pool from "./db/pool.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./middleware/logger.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import cartRouter from "./routes/cart.js";
import categoriesRouter from "./routes/categories.js";
import checkoutRouter from "./routes/checkout.js";
import ordersRouter from "./routes/orders.js";
import productsRouter from "./routes/products.js";
import searchRouter from "./routes/search.js";
import webhooksRouter from "./routes/webhooks.js";

const app = express();

// Middleware
app.use(cors());
app.use(logger);
// Webhooks need the raw request body for signature checks, so they're mounted
// BEFORE express.json() — otherwise the body would already be parsed.
app.use("/webhooks", webhooksRouter);
app.use(express.json());

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "EasyMart API" });
});

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW() as time");
    res.json({ db: "ok", time: result.rows[0].time });
  } catch (err) {
    res.status(HttpStatus.InternalServerError).json({ db: "error" });
  }
});

app.use("/products", productsRouter);
app.use("/categories", categoriesRouter);
app.use("/search", searchRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/cart", cartRouter);
app.use("/checkout", checkoutRouter);
app.use("/orders", ordersRouter);

// Error handler — must be last
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
});

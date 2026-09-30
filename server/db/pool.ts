import pg from "pg"
import { env } from "../config/env.js"

const { Pool } = pg

const pool = new Pool({
  connectionString: env.databaseUrl,
})

// Test the connection when this module loads
pool.on("connect", () => {
  console.log("📦 Connected to PostgreSQL")
})

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err)
})

export default pool

import pg from "pg"

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Test the connection when this module loads
pool.on("connect", () => {
  console.log("📦 Connected to PostgreSQL")
})

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err)
})

export default pool

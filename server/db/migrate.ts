import "dotenv/config"
import { readFileSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import pool from "./pool.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, "migrations")

async function migrate() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort() // 001_, 002_, ... ensures correct order

  console.log(`Running ${files.length} migrations...\n`)

  for (const file of files) {
    const filePath = join(migrationsDir, file)
    const sql = readFileSync(filePath, "utf-8")

    try {
      await pool.query(sql)
      console.log(`✅ ${file}`)
    } catch (err) {
      console.error(`❌ ${file}:`, (err as Error).message)
      process.exit(1)
    }
  }

  console.log("\n✅ All migrations complete.")
  await pool.end()
}

migrate()

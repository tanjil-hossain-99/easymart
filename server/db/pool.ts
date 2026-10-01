import pg from "pg"
import { env } from "../config/env.js"

const { Pool } = pg

// Start with a small bootstrap pool just to read Postgres config.
// We can't know max_connections before we connect, and we need a connection to ask.
const bootstrap = new Pool({ connectionString: env.databaseUrl, max: 2 })

async function createPool(): Promise<pg.Pool> {
  const { rows } = await bootstrap.query<{ max_connections: string }>("SHOW max_connections")
  await bootstrap.end()

  const pgMax = parseInt(rows[0].max_connections, 10)

  // Leave 20% headroom for admin tools, migrations, and other processes.
  // Cap at 100 — beyond that you get diminishing returns and pg process overhead.
  const max = Math.min(Math.floor(pgMax * 0.8), 100)

  console.log(`📦 Connected to PostgreSQL (max_connections=${pgMax}, pool size=${max})`)

  return new Pool({
    connectionString: env.databaseUrl,
    max,
    idleTimeoutMillis: 30_000,    // close idle connections after 30s
    connectionTimeoutMillis: 3_000, // fail fast if pool is exhausted
  })
}

// Module exports a promise; callers await it once at startup (see server.ts)
const poolPromise = createPool()

// Proxy that awaits the pool before forwarding any call —
// routes import `pool` and call pool.query() exactly as before, nothing changes for them.
const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return async (...args: unknown[]) => {
      const resolved = await poolPromise
      return (resolved[prop as keyof pg.Pool] as Function)(...args)
    }
  },
})

pool.on = (event: string, listener: (...args: unknown[]) => void) => {
  poolPromise.then((p) => p.on(event as any, listener))
  return pool
}

pool.end = async () => {
  const resolved = await poolPromise
  return resolved.end()
}

export default pool

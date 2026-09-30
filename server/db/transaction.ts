import type { PoolClient } from "pg";
import pool from "./pool.js";

// Runs `work` inside BEGIN/COMMIT on ONE connection. If anything throws, ROLLBACK
// undoes every statement — so we never end up with an order that has no items.
//
// Why a dedicated client: pool.query() may run each query on a different connection,
// and a transaction only exists on the connection that ran BEGIN.
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    // Always return the connection to the pool, or the pool eventually runs dry
    client.release();
  }
}

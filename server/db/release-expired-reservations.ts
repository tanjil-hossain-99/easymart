import pool from "./pool.js";

// Releases stock reservations for pending orders whose 10-minute window has expired.
// Run this on a cron every minute: `*/1 * * * *`
//
// Usage: node --import tsx/esm server/db/release-expired-reservations.ts
async function releaseExpiredReservations() {
  const result = await pool.query(
    `UPDATE inventory
     SET reserved = 0, reserved_until = NULL
     WHERE reserved > 0 AND reserved_until < NOW()`,
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log(`Released reservations on ${result.rowCount} inventory row(s)`);
  }
  await pool.end();
}

releaseExpiredReservations().catch(async (err) => {
  console.error("Failed to release reservations:", err.message);
  await pool.end();
  process.exit(1);
});

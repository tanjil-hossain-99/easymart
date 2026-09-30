import { UserRole } from "../constants.js";
import type { PublicUser } from "../types.js";
import pool from "./pool.js";

// Usage: npx tsx db/make-admin.ts <email>
// The first admin can't be created through the API (who would authorize it?),
// so it's done by someone with direct database access.
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npx tsx db/make-admin.ts <email>");
  process.exit(1);
}

const result = await pool.query<PublicUser>(
  `UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role`,
  [UserRole.Admin, email],
);

if (result.rows.length === 0) {
  console.error(`❌ No user with email ${email}. Register first.`);
} else {
  console.log(`✅ ${email} is now an admin`);
}
await pool.end();

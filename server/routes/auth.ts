import bcrypt from "bcryptjs";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AUTH, HttpStatus, PgErrorCode } from "../constants.js";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import type { CredentialsBody, PublicUser, UserProfile, UserRow } from "../types.js";

const router = Router();

function signToken(user: PublicUser): string {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    expiresIn: AUTH.tokenExpiresIn,
  });
}

function readCredentials(body: CredentialsBody | undefined) {
  return {
    email: String(body?.email ?? "").trim().toLowerCase(),
    password: String(body?.password ?? ""),
  };
}

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post("/register", async (req: Request<{}, {}, CredentialsBody>, res: Response) => {
  const { email, password } = readCredentials(req.body);

  if (!email.includes("@") || password.length < AUTH.passwordMinLength) {
    res.status(HttpStatus.BadRequest).json({
      error: `Valid email and a password of at least ${AUTH.passwordMinLength} characters are required`,
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, AUTH.bcryptRounds);

  try {
    // role is not inserted — the DB default ('user') applies. Never take role from the request.
    const result = await pool.query<PublicUser>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, role`,
      [email, passwordHash],
    );
    const user = result.rows[0];
    res.status(HttpStatus.Created).json({ token: signToken(user), user });
  } catch (err) {
    if ((err as { code?: string }).code === PgErrorCode.UniqueViolation) {
      res.status(HttpStatus.Conflict).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/login", async (req: Request<{}, {}, CredentialsBody>, res: Response) => {
  const { email, password } = readCredentials(req.body);

  const result = await pool.query<Pick<UserRow, "id" | "email" | "role" | "password_hash">>(
    `SELECT id, email, role, password_hash FROM users WHERE email = $1`,
    [email],
  );
  const user = result.rows[0];

  // Same error for "no such email" and "wrong password" — don't reveal which emails exist
  const ok = !!user?.password_hash && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    res.status(HttpStatus.Unauthorized).json({ error: "Invalid email or password" });
    return;
  }

  const publicUser: PublicUser = { id: user.id, email: user.email, role: user.role };
  res.json({ token: signToken(publicUser), user: publicUser });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const result = await pool.query<UserProfile>(
    `SELECT id, email, role, avatar_url, created_at FROM users WHERE id = $1`,
    [req.user!.id],
  );
  if (result.rows.length === 0) {
    res.status(HttpStatus.NotFound).json({ error: "User not found" });
    return;
  }
  res.json(result.rows[0]);
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
// Stamps last_logout_at so requireAuth rejects this token from now on,
// even though it hasn't expired yet.
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  await pool.query(`UPDATE users SET last_logout_at = NOW() WHERE id = $1`, [req.user!.id]);
  res.status(HttpStatus.NoContent).send();
});

export default router;

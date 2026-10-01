import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AUTH, HttpStatus, UserRole } from "../constants.js";
import pool from "../db/pool.js";
import type { TokenPayload } from "../types.js";

export type AuthUser = {
  id: string;
  role: UserRole;
};

// Tell TypeScript that req.user exists (set by requireAuth below)
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith(AUTH.bearerPrefix)) {
    res.status(HttpStatus.Unauthorized).json({ error: "Not logged in" });
    return;
  }

  let payload: TokenPayload;
  try {
    const token = header.slice(AUTH.bearerPrefix.length);
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    res.status(HttpStatus.Unauthorized).json({ error: "Invalid or expired token" });
    return;
  }

  // Reject tokens issued before the user last logged out — invalidates stolen tokens
  const result = await pool.query<{ last_logout_at: Date | null }>(
    `SELECT last_logout_at FROM users WHERE id = $1`,
    [payload.sub],
  );
  const lastLogout = result.rows[0]?.last_logout_at;
  if (lastLogout && payload.iat && payload.iat < lastLogout.getTime() / 1000) {
    res.status(HttpStatus.Unauthorized).json({ error: "Session expired, please log in again" });
    return;
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}

// Must run AFTER requireAuth (it relies on req.user being set).
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== UserRole.Admin) {
    res.status(HttpStatus.Forbidden).json({ error: "Admins only" });
    return;
  }
  next();
}

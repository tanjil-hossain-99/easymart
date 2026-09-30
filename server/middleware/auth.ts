import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AUTH, HttpStatus, UserRole } from "../constants.js";
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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith(AUTH.bearerPrefix)) {
    res.status(HttpStatus.Unauthorized).json({ error: "Not logged in" });
    return;
  }

  try {
    const token = header.slice(AUTH.bearerPrefix.length);
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(HttpStatus.Unauthorized).json({ error: "Invalid or expired token" });
  }
}

// Must run AFTER requireAuth (it relies on req.user being set).
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== UserRole.Admin) {
    res.status(HttpStatus.Forbidden).json({ error: "Admins only" });
    return;
  }
  next();
}

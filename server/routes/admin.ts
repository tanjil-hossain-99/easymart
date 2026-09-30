import { Request, Response, Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

// Every route in this file requires a logged-in admin
router.use(requireAuth, requireAdmin);

// GET /admin/ping — temporary, just to test the guard
router.get("/ping", (req: Request, res: Response) => {
  res.json({ ok: true, admin: req.user });
});

export default router;

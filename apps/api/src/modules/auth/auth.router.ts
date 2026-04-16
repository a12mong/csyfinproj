import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { login, register } from "./auth.service.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const authRouter: IRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/auth/login
authRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await login(parsed.data);
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (matches JWT expiry)
      path: "/",
    });
    res.json({ user: result.user });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/auth/logout
authRouter.post("/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
});

// POST /api/v1/auth/register  (admin only)
authRouter.post("/register", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await register(parsed.data);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

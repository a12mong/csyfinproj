import { Router, type IRouter } from "express";
import {
  listUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from "./users.schemas.js";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  resetPassword,
} from "./users.service.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const usersRouter: IRouter = Router();

// All user management endpoints are admin-only
usersRouter.use(requireAuth, requireRole("admin"));

// GET /api/v1/users
usersRouter.get("/", async (req, res) => {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await listUsers(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/users/:id
usersRouter.get("/:id", async (req, res) => {
  try {
    const result = await getUserById(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/users
usersRouter.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await createUser(parsed.data);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/users/:id
usersRouter.patch("/:id", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateUser(
      req.params["id"] as string,
      parsed.data,
      req.user!.sub
    );
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// DELETE /api/v1/users/:id  (soft delete — sets active=false)
usersRouter.delete("/:id", async (req, res) => {
  try {
    const result = await deactivateUser(
      req.params["id"] as string,
      req.user!.sub
    );
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/users/:id/reactivate
usersRouter.patch("/:id/reactivate", async (req, res) => {
  try {
    const result = await reactivateUser(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/users/:id/reset-password
usersRouter.patch("/:id/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await resetPassword(req.params["id"] as string, parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

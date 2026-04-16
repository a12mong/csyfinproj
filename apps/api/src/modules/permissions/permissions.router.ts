import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { bulkUpdatePermissionsSchema } from "./permissions.schemas.js";
import {
  getUserPermissions,
  updateUserPermissions,
} from "./permissions.service.js";

export const permissionsRouter: IRouter = Router();

// GET /api/v1/permissions/me — current user's own permissions (any authenticated user)
permissionsRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await getUserPermissions(req.user!.sub);
    res.json({ data: result });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/users/:userId/permissions — admin-only
permissionsRouter.get(
  "/users/:userId/permissions",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await getUserPermissions(req.params["userId"] as string);
      res.json({ data: result });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
    }
  }
);

// PUT /api/v1/users/:userId/permissions — bulk-update, admin-only
permissionsRouter.put(
  "/users/:userId/permissions",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const parsed = bulkUpdatePermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    try {
      const result = await updateUserPermissions(
        req.params["userId"] as string,
        parsed.data
      );
      res.json({ data: result });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
    }
  }
);

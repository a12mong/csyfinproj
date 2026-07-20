import { Router, type IRouter } from "express";
import { requireAuth, requireRole, resolveUserPermissions } from "../../middleware/auth.js";
import { bulkUpdatePermissionsSchema } from "./permissions.schemas.js";
import {
  getUserPermissions,
  updateUserPermissions,
} from "./permissions.service.js";
import { PAGES } from "../roles/roles.service.js";

export const permissionsRouter: IRouter = Router();

// GET /api/v1/permissions/me — current user's effective permissions from the
// role tree. Returns both the legacy page matrix (canView/canCreate/canEdit/
// canDelete, derived from view/edit) and the full "<page>.<action>" map.
permissionsRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const perms = await resolveUserPermissions(req.user!.sub, req.user!.role);
    const permissions = PAGES.map((page) => ({
      page,
      canView: !!perms[`${page}.view`],
      canCreate: !!perms[`${page}.edit`],
      canEdit: !!perms[`${page}.edit`],
      canDelete: !!perms[`${page}.edit`],
    }));
    res.json({ data: { role: req.user!.role, permissions, actions: perms } });
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

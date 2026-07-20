import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  getEffectivePermissions,
  PAGES,
  actionsForPage,
} from "./roles.service.js";
import type { PermissionPage } from "@prisma/client";

export const rolesRouter: IRouter = Router();

// Reading the role list requires login only (users page needs it for dropdowns);
// every mutation is admin-only.
rolesRouter.use(requireAuth);

const pageEnum = z.enum([
  "dashboard",
  "inventory",
  "receiving",
  "sales",
  "customers",
  "contracts",
  "finance",
  "payments",
  "settings",
]);

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  parent_id: z.string().uuid().nullable().optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const setPermissionsSchema = z.object({
  entries: z
    .array(
      z.object({
        page: pageEnum,
        action: z.string().min(1).max(40),
        allow: z.boolean(),
      })
    )
    .max(200),
});

// GET /api/v1/roles — flat list with counts (client builds the tree)
rolesRouter.get("/", async (_req, res) => {
  try {
    const data = await listRoles();
    res.json({ data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/roles/meta — pages + actions per page (for the permission editor)
rolesRouter.get("/meta", (_req, res) => {
  res.json({
    data: {
      pages: PAGES.map((p) => ({ page: p, actions: actionsForPage(p as PermissionPage) })),
    },
  });
});

// GET /api/v1/roles/:id/permissions — effective (inherited) matrix
rolesRouter.get("/:id/permissions", requireRole("admin"), async (req, res) => {
  try {
    const perms = await getEffectivePermissions(req.params["id"] as string);
    res.json({ data: perms });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/roles
rolesRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = createRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const role = await createRole(parsed.data);
    res.status(201).json({ data: role });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/roles/:id
rolesRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const role = await updateRole(req.params["id"] as string, parsed.data);
    res.json({ data: role });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// DELETE /api/v1/roles/:id
rolesRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const result = await deleteRole(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PUT /api/v1/roles/:id/permissions
rolesRouter.put("/:id/permissions", requireRole("admin"), async (req, res) => {
  const parsed = setPermissionsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  try {
    const perms = await setRolePermissions(req.params["id"] as string, parsed.data.entries);
    res.json({ data: perms });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

import { Router, type IRouter } from "express";
import { createAddonSchema, updateAddonSchema } from "./addons.schemas.js";
import { createAddon, listAddons, updateAddon } from "./addons.service.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";

export const addonsRouter: IRouter = Router();

// POST /api/v1/addons
addonsRouter.post("/", requireAuth, requirePermission("inventory", "edit"), async (req, res) => {
  const parsed = createAddonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await createAddon(parsed.data);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/addons
addonsRouter.get("/", requireAuth, requirePermission("inventory", "view"), async (req, res) => {
  try {
    const { type, search } = req.query;
    const result = await listAddons({
      type: typeof type === "string" ? type : undefined,
      search: typeof search === "string" ? search : undefined,
    });
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/addons/:id
addonsRouter.patch("/:id", requireAuth, requirePermission("inventory", "edit"), async (req, res) => {
  const parsed = updateAddonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateAddon(req.params.id as string, parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});


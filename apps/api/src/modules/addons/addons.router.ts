import { Router, type IRouter } from "express";
import { createAddonSchema } from "./addons.schemas.js";
import { createAddon, listAddons } from "./addons.service.js";
import { requireAuth } from "../../middleware/auth.js";

export const addonsRouter: IRouter = Router();

// POST /api/v1/addons
addonsRouter.post("/", requireAuth, async (req, res) => {
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
addonsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const result = await listAddons();
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

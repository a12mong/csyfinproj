import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { isSettingKey, listSettings, updateSetting } from "./settings.service.js";

export const settingsRouter: IRouter = Router();

// GET /api/v1/settings — list whitelisted system settings
settingsRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const data = await listSettings();
    res.json({ data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PUT /api/v1/settings/:key — admin only
settingsRouter.put("/:key", requireAuth, requireRole("admin"), async (req, res) => {
  const key = req.params["key"] as string;
  if (!isSettingKey(key)) {
    res.status(404).json({ error: `Unknown setting: ${key}` });
    return;
  }
  const value = req.body?.value;
  if (typeof value !== "string" || value.length > 500) {
    res.status(400).json({ error: "value must be a string (max 500 chars)" });
    return;
  }

  try {
    const data = await updateSetting(key, value);
    res.json({ data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

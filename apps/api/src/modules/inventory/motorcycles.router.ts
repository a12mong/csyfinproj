import { Router, type IRouter, type Request } from "express";
import { requireAuth, requirePermission, resolveUserPermissions } from "../../middleware/auth.js";
import {
  createMotorcycleSchema,
  updateMotorcycleSchema,
  listMotorcyclesSchema,
} from "./motorcycles.schemas.js";
import {
  createMotorcycle,
  listMotorcycles,
  getMotorcycle,
  updateMotorcycle,
} from "./motorcycles.service.js";

export const motorcyclesRouter: IRouter = Router();

// All routes require authentication
motorcyclesRouter.use(requireAuth);

/**
 * Remove price fields the requesting user is not allowed to see.
 * Strips both snake_case and camelCase copies emitted by the formatter.
 */
async function stripPrices<T extends Record<string, unknown>>(
  req: Request,
  rows: T[]
): Promise<T[]> {
  if (!req.user) return rows;
  const perms = await resolveUserPermissions(req.user.sub, req.user.role);
  const hideCost = !perms["inventory.view_cost_price"];
  const hideSelling = !perms["inventory.view_selling_price"];
  if (!hideCost && !hideSelling) return rows;

  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    if (hideCost) {
      delete copy["cost_price"];
      delete copy["costPrice"];
    }
    if (hideSelling) {
      delete copy["selling_price"];
      delete copy["sellingPrice"];
    }
    return copy as T;
  });
}

// GET /api/v1/motorcycles
motorcyclesRouter.get("/", requirePermission("inventory", "view"), async (req, res) => {
  const parsed = listMotorcyclesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await listMotorcycles(parsed.data);
    const data = await stripPrices(req, result.data as Record<string, unknown>[]);
    res.json({ ...result, data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/motorcycles/:id
motorcyclesRouter.get("/:id", requirePermission("inventory", "view"), async (req, res) => {
  try {
    const motorcycle = await getMotorcycle(req.params["id"] as string);
    const [data] = await stripPrices(req, [motorcycle as unknown as Record<string, unknown>]);
    res.json({ data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/motorcycles
motorcyclesRouter.post("/", requirePermission("inventory", "edit"), async (req, res) => {
  const parsed = createMotorcycleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const motorcycle = await createMotorcycle(parsed.data);
    res.status(201).json({ data: motorcycle });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/motorcycles/:id
motorcyclesRouter.patch("/:id", requirePermission("inventory", "edit"), async (req, res) => {
  const parsed = updateMotorcycleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const motorcycle = await updateMotorcycle(req.params["id"] as string, parsed.data);
    res.json({ data: motorcycle });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

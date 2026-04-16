import { Router, type IRouter } from "express";
import { requireAuth } from "../../middleware/auth.js";
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

// GET /api/v1/motorcycles
motorcyclesRouter.get("/", async (req, res) => {
  const parsed = listMotorcyclesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await listMotorcycles(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/motorcycles/:id
motorcyclesRouter.get("/:id", async (req, res) => {
  try {
    const motorcycle = await getMotorcycle(req.params.id);
    res.json({ data: motorcycle });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/motorcycles
motorcyclesRouter.post("/", async (req, res) => {
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
motorcyclesRouter.patch("/:id", async (req, res) => {
  const parsed = updateMotorcycleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const motorcycle = await updateMotorcycle(req.params.id, parsed.data);
    res.json({ data: motorcycle });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

import { Router, type IRouter } from "express";
import { createSaleSchema, updateSaleSchema } from "./sales.schemas.js";
import { createSale, listSales, getSaleDetail, updateSale } from "./sales.service.js";
import { requireAuth } from "../../middleware/auth.js";

export const salesRouter: IRouter = Router();

// POST /api/v1/sales
salesRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const userId = req.user?.sub || "unknown";
    const result = await createSale(parsed.data, userId);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/sales
salesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const customer_id = req.query.customer_id as string | undefined;
    const payment_method = req.query.payment_method as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const result = await listSales({ status, customer_id, payment_method, page, limit });
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/sales/:id
salesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await getSaleDetail(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/sales/:id
salesRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateSale(req.params["id"] as string, parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

import { Router, type IRouter } from "express";
import { createPaymentSchema, verifyPaymentSchema } from "./payments.schemas.js";
import { recordPayment, verifyPayment, getPaymentDetail } from "./payments.service.js";
import { requireAuth } from "../../middleware/auth.js";

export const paymentsRouter: IRouter = Router();

// POST /api/v1/payments
paymentsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await recordPayment(parsed.data);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/payments/:id/verify
paymentsRouter.patch("/:id/verify", requireAuth, async (req, res) => {
  const parsed = verifyPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const userId = req.user?.sub || "unknown";
    const result = await verifyPayment(req.params["id"] as string, parsed.data, userId);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/payments/:id
paymentsRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await getPaymentDetail(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

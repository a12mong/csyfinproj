import { Router, type IRouter } from "express";
import { listInstallmentsQuerySchema } from "./installments.schemas.js";
import { listInstallments, getInstallmentDetail } from "./installments.service.js";
import { requireAuth } from "../../middleware/auth.js";

export const installmentsRouter: IRouter = Router();

// GET /api/v1/installments
installmentsRouter.get("/", requireAuth, async (req, res) => {
  const parsed = listInstallmentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await listInstallments(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/installments/:id
installmentsRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await getInstallmentDetail(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

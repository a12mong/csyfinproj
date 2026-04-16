import { Router, type IRouter } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { listFinancialInstitutions } from "./financial-institutions.service.js";

export const financialInstitutionsRouter: IRouter = Router();

// GET /api/v1/financial-institutions?active=true
financialInstitutionsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";
    const result = await listFinancialInstitutions(activeOnly);
    res.json(result);
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message });
  }
});

import { Router, type IRouter } from "express";
import {
  createContractSchema,
  updateContractSchema,
  listContractsQuerySchema,
} from "./contracts.schemas.js";
import {
  createContract,
  listContracts,
  getContractDetail,
  updateContract,
  generateContractInstallments,
} from "./contracts.service.js";
import { requireAuth } from "../../middleware/auth.js";

export const contractsRouter: IRouter = Router();

// POST /api/v1/contracts
contractsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createContractSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const userId = req.user?.sub || "unknown";
    const result = await createContract(parsed.data, userId);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/contracts
contractsRouter.get("/", requireAuth, async (req, res) => {
  const parsed = listContractsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await listContracts(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/contracts/:id
contractsRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await getContractDetail(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/contracts/:id
contractsRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateContractSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateContract(req.params["id"] as string, parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/contracts/:id/generate-installments
contractsRouter.post("/:id/generate-installments", requireAuth, async (req, res) => {
  try {
    const result = await generateContractInstallments(req.params["id"] as string);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

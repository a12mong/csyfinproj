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
import { generateCoverPageHtml, generateFullAgreementHtml } from "./contracts-print.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";

export const contractsRouter: IRouter = Router();

// POST /api/v1/contracts
contractsRouter.post("/", requireAuth, requirePermission("contracts", "edit"), async (req, res) => {
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
contractsRouter.get("/", requireAuth, requirePermission("contracts", "view"), async (req, res) => {
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
contractsRouter.get("/:id", requireAuth, requirePermission("contracts", "view"), async (req, res) => {
  try {
    const result = await getContractDetail(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/contracts/:id/print/cover
contractsRouter.get("/:id/print/cover", requireAuth, requirePermission("contracts", "view"), async (req, res) => {
  try {
    const result = await getContractDetail(req.params["id"] as string);
    const html = generateCoverPageHtml(result.data);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(500).send(`Error: ${e.message ?? "Internal server error"}`);
  }
});

// GET /api/v1/contracts/:id/print/full
contractsRouter.get("/:id/print/full", requireAuth, requirePermission("contracts", "view"), async (req, res) => {
  try {
    const result = await getContractDetail(req.params["id"] as string);
    const html = generateFullAgreementHtml(result.data);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(500).send(`Error: ${e.message ?? "Internal server error"}`);
  }
});

// PATCH /api/v1/contracts/:id
contractsRouter.patch("/:id", requireAuth, requirePermission("contracts", "edit"), async (req, res) => {
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
contractsRouter.post("/:id/generate-installments", requireAuth, requirePermission("contracts", "edit"), async (req, res) => {
  try {
    const result = await generateContractInstallments(req.params["id"] as string);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

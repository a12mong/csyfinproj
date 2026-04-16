import { Router, type IRouter } from "express";
import { createCustomerSchema, updateCustomerSchema } from "./customers.schemas.js";
import { createCustomer, listCustomers, getCustomerDetail, updateCustomer } from "./customers.service.js";
import { requireAuth } from "../../middleware/auth.js";

export const customersRouter: IRouter = Router();

// POST /api/v1/customers
customersRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await createCustomer(parsed.data);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/customers
customersRouter.get("/", requireAuth, async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const result = await listCustomers({ search, type, page, limit });
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/customers/:id
customersRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await getCustomerDetail(req.params["id"] as string);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/customers/:id
customersRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateCustomer(req.params["id"] as string, parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

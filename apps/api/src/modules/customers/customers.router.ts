import { Router, type IRouter } from "express";
import { createCustomerSchema, updateCustomerSchema } from "./customers.schemas.js";
import { createCustomer, listCustomers, getCustomerDetail, updateCustomer, linkCustomerLine, unlinkCustomerLine, generateLineLinkCode } from "./customers.service.js";
import { requireAuth, requirePermission, requireRole, resolveUserPermissions } from "../../middleware/auth.js";
import { getSetting } from "../settings/settings.service.js";
import { maskIdCard } from "../../lib/audit.js";
import { anonymizeCustomer } from "./customers.service.js";
import type { Request } from "express";

/**
 * PDPA: mask the national ID card number in customer payloads unless the
 * requesting user has the customers.view_pii permission.
 */
async function maskCustomerPii<T>(req: Request, payload: T): Promise<T> {
  if (!req.user) return payload;
  const perms = await resolveUserPermissions(req.user.sub, req.user.role);
  if (perms["customers.view_pii"]) return payload;

  const maskOne = (c: Record<string, unknown>) => {
    if (typeof c["idCardNumber"] === "string") c["idCardNumber"] = maskIdCard(c["idCardNumber"] as string);
    if (typeof c["id_card_number"] === "string") c["id_card_number"] = maskIdCard(c["id_card_number"] as string);
    return c;
  };
  if (Array.isArray(payload)) return (payload as unknown[]).map((c) => maskOne(c as Record<string, unknown>)) as T;
  if (payload && typeof payload === "object") return maskOne(payload as Record<string, unknown>) as T;
  return payload;
}

export const customersRouter: IRouter = Router();

// GET /api/v1/customers/:id/link-status (public)
customersRouter.get("/:id/link-status", async (req, res) => {
  try {
    const result = await getCustomerDetail(req.params["id"] as string);
    res.json({
      name: result.data.name,
      isLineLinked: result.data.isLineLinked,
      lineId: result.data.lineId,
      linePictureUrl: result.data.linePictureUrl,
    });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/customers/:id/link-line (public)
customersRouter.post("/:id/link-line", async (req, res) => {
  try {
    const lineId = req.body.lineId as string | undefined;
    const linePictureUrl = req.body.linePictureUrl as string | undefined;
    if (!lineId || !lineId.trim()) {
      res.status(400).json({ error: "LINE ID is required" });
      return;
    }
    const result = await linkCustomerLine(req.params["id"] as string, lineId.trim(), linePictureUrl);
    res.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/customers/:id/line-link-code (requires auth)
// Staff-triggered: issue a short-lived code the customer sends to the LINE OA
customersRouter.post("/:id/line-link-code", requireAuth, requirePermission("customers", "edit"), async (req, res) => {
  try {
    const result = await generateLineLinkCode(req.params["id"] as string);
    const oaBasicId = await getSetting("line_oa_basic_id");
    res.json({
      data: {
        ...result.data,
        oa_basic_id: oaBasicId,
      },
    });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/customers/:id/unlink-line (requires auth)
customersRouter.post("/:id/unlink-line", requireAuth, requirePermission("customers", "edit"), async (req, res) => {
  try {
    const result = await unlinkCustomerLine(req.params["id"] as string);
    res.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/customers
customersRouter.post("/", requireAuth, requirePermission("customers", "edit"), async (req, res) => {
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
customersRouter.get("/", requireAuth, requirePermission("customers", "view"), async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const result = await listCustomers({ search, type, page, limit });
    result.data = await maskCustomerPii(req, result.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/customers/:id
customersRouter.get("/:id", requireAuth, requirePermission("customers", "view"), async (req, res) => {
  try {
    const result = await getCustomerDetail(req.params["id"] as string);
    result.data = await maskCustomerPii(req, result.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/customers/:id/anonymize — PDPA right to erasure (admin only)
// Blocked while the customer has activity within the configured lock period.
customersRouter.post("/:id/anonymize", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const lockYears =
      parseInt((await getSetting("customer_erasure_lock_years")) ?? "5") || 5;
    const result = await anonymizeCustomer(req.params["id"] as string, lockYears);
    res.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/customers/:id
customersRouter.patch("/:id", requireAuth, requirePermission("customers", "edit"), async (req, res) => {
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

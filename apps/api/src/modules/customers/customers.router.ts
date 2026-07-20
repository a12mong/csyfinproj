import { Router, type IRouter } from "express";
import { createCustomerSchema, updateCustomerSchema } from "./customers.schemas.js";
import { createCustomer, listCustomers, getCustomerDetail, updateCustomer, linkCustomerLine, unlinkCustomerLine, generateLineLinkCode } from "./customers.service.js";
import { requireAuth, requirePermission, requireRole, resolveUserPermissions } from "../../middleware/auth.js";
import { getSetting } from "../settings/settings.service.js";
import { maskIdCard } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";
import { uploadCustomerDocs, SECURE_UPLOAD_DIR } from "../../lib/upload.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { anonymizeCustomer } from "./customers.service.js";
import type { Request } from "express";


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
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// ─── Identity documents (รูปบัตรประชาชน / รูปคู่บัตร) — PDPA protected ──────────

const DOC_FIELDS = {
  id_card: "idCardImagePath",
  selfie: "idCardSelfiePath",
} as const;

/** Pre-render a heavily blurred copy at upload time for non-PII viewers. */
async function createBlurredCopy(filename: string): Promise<void> {
  const src = path.join(SECURE_UPLOAD_DIR, filename);
  const dest = path.join(SECURE_UPLOAD_DIR, `blur-${filename}.jpg`);
  await sharp(src).resize(600).blur(18).jpeg({ quality: 60 }).toFile(dest);
}

// POST /api/v1/customers/:id/documents — upload id card / selfie images
customersRouter.post(
  "/:id/documents",
  requireAuth,
  requirePermission("customers", "edit"),
  uploadCustomerDocs.fields([
    { name: "id_card_image", maxCount: 1 },
    { name: "id_card_selfie", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const idCard = files?.["id_card_image"]?.[0];
      const selfie = files?.["id_card_selfie"]?.[0];
      if (!idCard && !selfie) {
        res.status(400).json({ error: "กรุณาแนบรูปอย่างน้อย 1 รูป" });
        return;
      }

      const data: Record<string, string> = {};
      if (idCard) {
        await createBlurredCopy(idCard.filename);
        data["idCardImagePath"] = idCard.filename;
      }
      if (selfie) {
        await createBlurredCopy(selfie.filename);
        data["idCardSelfiePath"] = selfie.filename;
      }

      await prisma.customer.update({ where: { id: req.params["id"] as string }, data });
      res.json({ success: true });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
    }
  }
);

// GET /api/v1/customers/:id/documents/:type — stream image; blurred without view_pii
customersRouter.get(
  "/:id/documents/:type",
  requireAuth,
  requirePermission("customers", "view"),
  async (req, res) => {
    try {
      const type = req.params["type"] as string;
      const field = DOC_FIELDS[type as keyof typeof DOC_FIELDS];
      if (!field) {
        res.status(404).json({ error: "ไม่รู้จักประเภทเอกสาร" });
        return;
      }
      const customer = await prisma.customer.findUnique({
        where: { id: req.params["id"] as string },
        select: { idCardImagePath: true, idCardSelfiePath: true, name: true },
      });
      const filename = customer?.[field];
      if (!customer || !filename) {
        res.status(404).json({ error: "ไม่พบรูปเอกสาร" });
        return;
      }

      const perms = await resolveUserPermissions(req.user!.sub, req.user!.role);
      const canViewPii = !!perms["customers.view_pii"];
      const fileToServe = canViewPii ? filename : `blur-${filename}.jpg`;
      const filePath = path.join(SECURE_UPLOAD_DIR, path.basename(fileToServe));
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "ไม่พบไฟล์รูป" });
        return;
      }

      // PDPA: viewing the full (unblurred) document is itself audited
      if (canViewPii) {
        prisma.auditLog
          .create({
            data: {
              userId: req.user!.sub,
              userName: req.user!.email,
              action: "view",
              entity: "customers",
              entityId: req.params["id"] as string,
              summary: `ดูรูปเอกสารยืนยันตัวตน (${type}) ของลูกค้า "${customer.name}" แบบไม่เบลอ`,
            },
          })
          .catch(() => {});
      }

      res.setHeader("Cache-Control", "private, max-age=60");
      res.sendFile(path.resolve(filePath));
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
    }
  }
);

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

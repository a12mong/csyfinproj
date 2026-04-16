import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import {
  createPaymentBodySchema,
  verifyPaymentSchema,
  listPaymentsQuerySchema,
} from "./payments.schemas.js";
import {
  listPayments,
  recordPayment,
  verifyPayment,
  getPaymentDetail,
} from "./payments.service.js";
import { requireAuth } from "../../middleware/auth.js";
import { uploadSlip } from "../../lib/upload.js";

export const paymentsRouter: IRouter = Router();

// GET /api/v1/payments — list payments with optional filters
paymentsRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = listPaymentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await listPayments(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/payments — multipart/form-data with optional slip image
paymentsRouter.post(
  "/",
  requireAuth,
  (req: Request, res: Response, next) => {
    uploadSlip.single("slip_image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "File too large. Maximum size is 5MB." });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err) {
        res.status(400).json({ error: (err as Error).message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const parsed = createPaymentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    try {
      const slipImageUrl = req.file
        ? `/uploads/${path.basename(req.file.path)}`
        : undefined;

      const result = await recordPayment({ ...parsed.data, slip_image: slipImageUrl });
      res.status(201).json(result);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
    }
  }
);

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

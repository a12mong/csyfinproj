import { Router, type IRouter } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createDeliveryNoteSchema,
  listDeliveryNotesSchema,
  updateDeliveryNoteSchema,
} from "./delivery-notes.schemas.js";
import {
  createDeliveryNote,
  listDeliveryNotes,
  getDeliveryNote,
  updateDeliveryNote,
} from "./delivery-notes.service.js";

export const deliveryNotesRouter: IRouter = Router();

deliveryNotesRouter.use(requireAuth);

// GET /api/v1/delivery-notes
deliveryNotesRouter.get("/", async (req, res) => {
  const parsed = listDeliveryNotesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await listDeliveryNotes(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/delivery-notes/:id
deliveryNotesRouter.get("/:id", async (req, res) => {
  try {
    const result = await getDeliveryNote(req.params.id);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/delivery-notes
deliveryNotesRouter.post("/", async (req, res) => {
  const parsed = createDeliveryNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await createDeliveryNote(parsed.data, req.user!.sub);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// PATCH /api/v1/delivery-notes/:id
deliveryNotesRouter.patch("/:id", async (req, res) => {
  const parsed = updateDeliveryNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await updateDeliveryNote(req.params.id, parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

import { z } from "zod";

const deliveryNoteItemSchema = z.object({
  item_type: z.enum(["motorcycle", "part", "accessory"]),
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive(),
  unit_cost: z.number().positive(),
  // For motorcycle items: chassis/engine numbers (required per item when type=motorcycle)
  chassis_numbers: z.array(z.string().min(1)).optional(),
  engine_numbers: z.array(z.string().min(1)).optional(),
  color: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  selling_price: z.number().positive().optional(),
});

export const createDeliveryNoteSchema = z.object({
  note_number: z.string().min(1).max(50),
  supplier_name: z.string().min(1).max(255),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  notes: z.string().optional(),
  items: z.array(deliveryNoteItemSchema).min(1),
});

export const listDeliveryNotesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "verified", "cancelled"]).optional(),
  supplier: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateDeliveryNoteSchema = z.object({
  status: z.enum(["verified", "cancelled"]),
  notes: z.string().optional(),
});

export type CreateDeliveryNoteInput = z.infer<typeof createDeliveryNoteSchema>;
export type ListDeliveryNotesInput = z.infer<typeof listDeliveryNotesSchema>;
export type UpdateDeliveryNoteInput = z.infer<typeof updateDeliveryNoteSchema>;

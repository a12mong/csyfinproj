import { z } from "zod";

export const createMotorcycleSchema = z.object({
  brand: z.string().min(1).default("Yamaha"),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  chassis_number: z.string().min(1),
  engine_number: z.string().min(1),
  color: z.string().min(1),
  cost_price: z.number().positive(),
  selling_price: z.number().positive(),
});

export const updateMotorcycleSchema = z.object({
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  color: z.string().min(1).optional(),
  cost_price: z.number().positive().optional(),
  selling_price: z.number().positive().optional(),
  status: z.enum(["in_stock", "reserved", "sold"]).optional(),
});

export const listMotorcyclesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["in_stock", "reserved", "sold"]).optional(),
  search: z.string().optional(),
  sort_by: z.enum(["createdAt", "model", "sellingPrice"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export type CreateMotorcycleInput = z.infer<typeof createMotorcycleSchema>;
export type UpdateMotorcycleInput = z.infer<typeof updateMotorcycleSchema>;
export type ListMotorcyclesInput = z.infer<typeof listMotorcyclesSchema>;

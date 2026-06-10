import { z } from "zod";

export const createAddonSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  cost_price: z.number().nonnegative().optional(),
  stock_qty: z.number().int().nonnegative().optional(),
  type: z.enum(["part", "accessory", "service"]).optional(),
  sku: z.string().optional(),
});

export const updateAddonSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  cost_price: z.number().nonnegative().optional(),
  stock_qty: z.number().int().optional(),
  type: z.enum(["part", "accessory", "service"]).optional(),
  sku: z.string().optional(),
  active: z.boolean().optional(),
});

export type CreateAddonInput = z.infer<typeof createAddonSchema>;
export type UpdateAddonInput = z.infer<typeof updateAddonSchema>;

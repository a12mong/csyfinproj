import { z } from "zod";

export const createSaleSchema = z.object({
  customer_id: z.string().uuid(),
  motorcycle_id: z.string().uuid(),
  total_price: z.number().positive(),
  down_payment: z.number().nonnegative(),
  num_installments: z.number().int().positive(),
  interest_rate: z.number().nonnegative(),
  payment_method: z.enum(["cash", "installment"]),
  addon_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
});

export const updateSaleSchema = z.object({
  status: z.enum(["active", "completed", "defaulted", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;

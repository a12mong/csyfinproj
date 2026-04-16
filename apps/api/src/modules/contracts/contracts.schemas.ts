import { z } from "zod";

export const contractStatusEnum = z.enum(["active", "completed", "defaulted", "cancelled"]);

export const createContractSchema = z.object({
  customer_id: z.string().uuid(),
  total_principal: z.number().positive(),
  interest_rate: z.number().nonnegative(),
  num_installments: z.number().int().positive(),
  start_date: z.string().date(),
  notes: z.string().optional(),
  sale_ids: z.array(z.string().uuid()).optional().default([]),
  generate_installments: z.boolean().optional().default(false),
});

export const updateContractSchema = z.object({
  status: contractStatusEnum.optional(),
  notes: z.string().optional(),
});

export const listContractsQuerySchema = z.object({
  customer_id: z.string().uuid().optional(),
  status: contractStatusEnum.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;

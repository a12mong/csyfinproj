import { z } from "zod";

export const contractStatusEnum = z.enum(["active", "completed", "defaulted", "cancelled"]);

export const createContractSchema = z
  .object({
    customer_id: z.string().uuid(),
    // Optional when sale_ids are provided — auto-summed from linked sales' financeAmount
    total_principal: z.number().positive().optional(),
    interest_rate: z.number().nonnegative(),
    num_installments: z.number().int().positive(),
    start_date: z.string().date(),
    notes: z.string().optional(),
    sale_ids: z.array(z.string().uuid()).optional().default([]),
    generate_installments: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (!data.total_principal && (!data.sale_ids || data.sale_ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "total_principal is required when no sale_ids are provided",
        path: ["total_principal"],
      });
    }
  });

export const updateContractSchema = z.object({
  status: contractStatusEnum.optional(),
  notes: z.string().optional(),
});

export const listContractsQuerySchema = z.object({
  customer_id: z.string().uuid().optional(),
  sale_id: z.string().uuid().optional(),
  status: contractStatusEnum.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// After superRefine, total_principal may still be undefined when sale_ids are present
// The service resolves it from linked sales in that case
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;

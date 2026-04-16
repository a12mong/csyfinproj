import { z } from "zod";

export const createSaleSchema = z
  .object({
    customer_id: z.string().uuid(),
    motorcycle_id: z.string().uuid(),
    total_price: z.number().positive(),
    down_payment: z.number().nonnegative(),
    payment_method: z.enum(["cash", "installment", "finance_company"]),
    finance_company_name: z.string().min(1).optional(),
    finance_reference_number: z.string().optional(),
    financial_institution_id: z.string().uuid().optional(),
    addon_ids: z.array(z.string().uuid()).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method === "finance_company" && !data.finance_company_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "finance_company_name is required when payment_method is finance_company",
        path: ["finance_company_name"],
      });
    }
  });

export const updateSaleSchema = z.object({
  status: z.enum(["active", "completed", "defaulted", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;

import { z } from "zod";

export const listInstallmentsQuerySchema = z.object({
  sale_id: z.string().uuid().optional(),
  status: z.enum(["pending", "paid", "overdue", "partially_paid"]).optional(),
  overdue: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  page: z
    .string()
    .transform((v) => parseInt(v))
    .optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v))
    .optional(),
});

export type ListInstallmentsQuery = z.infer<typeof listInstallmentsQuerySchema>;

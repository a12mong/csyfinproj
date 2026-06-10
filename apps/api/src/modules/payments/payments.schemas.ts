import { z } from "zod";

export const paymentChannelEnum = z.enum(["cash", "bank_transfer", "line"]);

// Multipart/form-data body schema — amount comes in as string, coerce to number
// Either installment_id or contract_id must be provided (not both required)
export const createPaymentBodySchema = z
  .object({
    installment_id: z.string().uuid().optional(),
    contract_id: z.string().uuid().optional(),
    sale_id: z.string().uuid().optional(),
    amount: z.coerce.number().positive(),
    payment_date: z.string().date(),
    payment_channel: paymentChannelEnum.default("cash"),
    notes: z.string().optional(),
  })
  .refine((d) => d.installment_id || d.contract_id || d.sale_id, {
    message: "Either installment_id, contract_id, or sale_id is required",
    path: ["installment_id"],
  });

export const verifyPaymentSchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
});

export const listPaymentsQuerySchema = z.object({
  installment_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
  contract_number: z.string().optional(),
  sale_id: z.string().uuid().optional(),
  payment_channel: paymentChannelEnum.optional(),
  verified: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return undefined;
    }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePaymentInput = z.infer<typeof createPaymentBodySchema> & {
  slip_image?: string;
};
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

// Narrowed type after refine — at least one of installment_id/contract_id is present
export type CreatePaymentInputResolved = CreatePaymentInput &
  ({ installment_id: string; contract_id?: string } | { installment_id?: string; contract_id: string });

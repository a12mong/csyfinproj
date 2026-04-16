import { z } from "zod";

export const paymentChannelEnum = z.enum(["cash", "bank_transfer", "line"]);

// Multipart/form-data body schema — amount comes in as string, coerce to number
export const createPaymentBodySchema = z.object({
  installment_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  payment_date: z.string().date(),
  payment_channel: paymentChannelEnum.default("cash"),
  notes: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
});

export const listPaymentsQuerySchema = z.object({
  installment_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
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

import { z } from "zod";

// Multipart/form-data body schema — amount comes in as string, coerce to number
export const createPaymentBodySchema = z.object({
  installment_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  payment_date: z.string().date(),
  notes: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentBodySchema> & {
  slip_image?: string;
};
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

import { z } from "zod";

export const createPaymentSchema = z.object({
  installment_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string().date(),
  slip_image: z.string().optional(),
  notes: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  verified: z.boolean(),
  notes: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

import { z } from "zod";

export const customerTypeSchema = z.enum(["personal", "individual", "finance"]);

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  id_card_number: z.string().regex(/^\d{13}$/, "ID card number must be exactly 13 digits"),
  email: z.string().email().optional(),
  line_id: z.string().optional(),
  address: z.string().optional(),
  type: customerTypeSchema.optional(),
  consent_accepted: z.boolean().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  line_id: z.string().optional(),
  address: z.string().optional(),
  type: customerTypeSchema.optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

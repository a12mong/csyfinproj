import { z } from "zod";

export const sendRemindersBodySchema = z.object({
  channel: z.enum(["line", "sms", "email"]).optional(),
  customer_id: z.string().uuid().optional(),
});

export const getLogsQuerySchema = z.object({
  customer_id: z.string().uuid().optional(),
  channel: z.enum(["line", "sms", "email"]).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type SendRemindersInput = z.infer<typeof sendRemindersBodySchema>;
export type GetLogsQuery = z.infer<typeof getLogsQuerySchema>;

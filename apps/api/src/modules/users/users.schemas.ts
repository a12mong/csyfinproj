import { z } from "zod";
import { usernameSchema } from "../auth/auth.schemas.js";

export const listUsersQuerySchema = z.object({
  role: z.enum(["admin", "staff", "viewer"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  active: z.enum(["true", "false"]).optional(),
});

export const createUserSchema = z.object({
  username: usernameSchema.optional(),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["admin", "staff", "viewer"]).default("staff"),
  role_id: z.string().uuid().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    username: usernameSchema.nullable().optional(),
    email: z.string().email().optional(),
    role: z.enum(["admin", "staff", "viewer"]).optional(),
    role_id: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

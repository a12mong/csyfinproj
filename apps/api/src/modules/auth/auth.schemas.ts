import { z } from "zod";

// Login accepts a username or an email in either field; username is the
// primary form, email is kept for backward compatibility with older clients
export const loginSchema = z
  .object({
    username: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((data) => data.username || data.email, {
    message: "username or email is required",
    path: ["username"],
  });

export const usernameSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-zA-Z0-9._-]+$/, "username must contain only letters, numbers, . _ -");

export const registerSchema = z.object({
  username: usernameSchema.optional(),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["admin", "staff", "viewer"]).default("staff"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "viewer";
}

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me";
const JWT_EXPIRES_IN = "8h";

function toUserDto(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserDto["role"],
  };
}

export async function login(input: LoginInput): Promise<{ token: string; user: UserDto }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  if (!user.active) {
    throw Object.assign(new Error("Account is inactive"), { statusCode: 403 });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { token, user: toUserDto(user) };
}

export async function register(
  input: RegisterInput
): Promise<{ user: UserDto }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    },
  });

  return { user: toUserDto(user) };
}

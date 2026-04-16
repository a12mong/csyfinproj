import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import type {
  ListUsersQuery,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
} from "./users.schemas.js";

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff" | "viewer";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toUserDto(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserDto["role"],
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function listUsers(query: ListUsersQuery) {
  const skip = (query.page - 1) * query.limit;

  const where: Record<string, unknown> = {};

  if (query.role) {
    where["role"] = query.role;
  }

  if (query.active !== undefined) {
    where["active"] = query.active === "true";
  }

  if (query.search) {
    where["OR"] = [
      { name: { contains: query.search } },
      { email: { contains: query.search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map(toUserDto),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }
  return { data: toUserDto(user) };
}

export async function createUser(input: CreateUserInput) {
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

  return { data: toUserDto(user) };
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  requesterId: string
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  // Prevent demoting the last admin
  if (input.role && input.role !== "admin" && user.role === "admin") {
    const adminCount = await prisma.user.count({
      where: { role: "admin", active: true },
    });
    if (adminCount <= 1) {
      throw Object.assign(
        new Error("Cannot change role: this is the last active admin"),
        { statusCode: 422 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.role !== undefined && { role: input.role }),
    },
  });

  return { data: toUserDto(updated) };
}

export async function deactivateUser(id: string, requesterId: string) {
  // Prevent self-deletion
  if (id === requesterId) {
    throw Object.assign(new Error("Cannot deactivate your own account"), {
      statusCode: 422,
    });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  if (!user.active) {
    throw Object.assign(new Error("User is already inactive"), {
      statusCode: 422,
    });
  }

  // Prevent deactivating the last admin
  if (user.role === "admin") {
    const activeAdminCount = await prisma.user.count({
      where: { role: "admin", active: true },
    });
    if (activeAdminCount <= 1) {
      throw Object.assign(
        new Error("Cannot deactivate the last active admin account"),
        { statusCode: 422 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  return { data: toUserDto(updated) };
}

export async function resetPassword(id: string, input: ResetPasswordInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);

  const updated = await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return { data: toUserDto(updated) };
}

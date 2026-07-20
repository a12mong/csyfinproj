import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import type {
  ListUsersQuery,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
} from "./users.schemas.js";
import { createDefaultPermissions } from "../permissions/permissions.service.js";

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
  roleId?: string | null;
  assignedRole?: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): UserDto & { roleId?: string | null; roleName?: string | null } {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserDto["role"],
    roleId: user.roleId ?? null,
    roleName: user.assignedRole?.name ?? null,
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
      include: { assignedRole: { select: { id: true, name: true } } },
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

/**
 * Resolve a Role row and the legacy enum value it maps to.
 * The enum stays in sync so requireRole("admin") keeps working.
 */
async function resolveRoleAssignment(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw Object.assign(new Error("ไม่พบ role ที่เลือก"), { statusCode: 404 });
  }
  return { roleId: role.id, enumRole: role.isSystem ? ("admin" as const) : ("staff" as const) };
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const assignment = input.role_id ? await resolveRoleAssignment(input.role_id) : null;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: assignment ? assignment.enumRole : input.role,
      ...(assignment && { roleId: assignment.roleId }),
    },
    include: { assignedRole: { select: { id: true, name: true } } },
  });

  await createDefaultPermissions(user.id, user.role);

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

  const assignment =
    input.role_id != null ? await resolveRoleAssignment(input.role_id) : null;

  // Prevent removing the last admin via role-tree reassignment
  if (assignment && assignment.enumRole !== "admin" && user.role === "admin") {
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
      ...(input.role !== undefined && !assignment && { role: input.role }),
      ...(assignment && { roleId: assignment.roleId, role: assignment.enumRole }),
      ...(input.role_id === null && { roleId: null }),
    },
    include: { assignedRole: { select: { id: true, name: true } } },
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

export async function reactivateUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  if (user.active) {
    throw Object.assign(new Error("User is already active"), { statusCode: 422 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active: true },
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

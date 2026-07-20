import { prisma } from "../../lib/prisma.js";
import type { PermissionPage } from "@prisma/client";

export const PAGES: PermissionPage[] = [
  "dashboard",
  "inventory",
  "receiving",
  "sales",
  "customers",
  "contracts",
  "finance",
  "payments",
  "settings",
];

// Base actions apply to every page; special actions only where listed
export const BASE_ACTIONS = ["view", "edit"] as const;
export const SPECIAL_ACTIONS: Partial<Record<PermissionPage, string[]>> = {
  inventory: ["view_cost_price", "view_selling_price"],
  customers: ["view_pii"],
  finance: ["send_reminder"],
  payments: ["approve_payment"],
};

export const MAX_TREE_DEPTH = 3;

export function actionsForPage(page: PermissionPage): string[] {
  return [...BASE_ACTIONS, ...(SPECIAL_ACTIONS[page] ?? [])];
}

/** All valid page.action pairs, e.g. "inventory.view_cost_price" */
export function allPermissionKeys(): string[] {
  return PAGES.flatMap((p) => actionsForPage(p).map((a) => `${p}.${a}`));
}

// ─── Effective permission resolution (with tiny TTL cache) ────────────────────

type PermMap = Record<string, boolean>;

const cache = new Map<string, { perms: PermMap; at: number }>();
const CACHE_TTL_MS = 30_000;

export function invalidatePermissionCache() {
  cache.clear();
}

/**
 * Walk the role chain root→leaf; child rows override parent rows.
 * System roles (admin) get every permission.
 */
export async function getEffectivePermissions(roleId: string): Promise<PermMap> {
  const cached = cache.get(roleId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.perms;

  // Build ancestor chain (leaf → root), bounded by MAX_TREE_DEPTH
  const chain: Array<{ id: string; isSystem: boolean }> = [];
  let currentId: string | null = roleId;
  for (let i = 0; i < MAX_TREE_DEPTH && currentId; i++) {
    const role: { id: string; isSystem: boolean; parentId: string | null } | null =
      await prisma.role.findUnique({
        where: { id: currentId },
        select: { id: true, isSystem: true, parentId: true },
      });
    if (!role) break;
    chain.push({ id: role.id, isSystem: role.isSystem });
    currentId = role.parentId;
  }

  const perms: PermMap = {};

  if (chain.some((r) => r.isSystem)) {
    for (const key of allPermissionKeys()) perms[key] = true;
  } else {
    const roleIds = chain.map((r) => r.id);
    const rows = await prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
    });
    // Apply root first, leaf last so the leaf overrides
    for (const id of [...roleIds].reverse()) {
      for (const row of rows.filter((r) => r.roleId === id)) {
        perms[`${row.page}.${row.action}`] = row.allow;
      }
    }
  }

  cache.set(roleId, { perms, at: Date.now() });
  return perms;
}

/** Legacy-enum fallback for users not yet assigned a Role row. */
export function legacyEnumPermissions(role: "admin" | "staff" | "viewer"): PermMap {
  const perms: PermMap = {};
  if (role === "admin") {
    for (const key of allPermissionKeys()) perms[key] = true;
    return perms;
  }
  for (const page of PAGES) {
    perms[`${page}.view`] = true;
    perms[`${page}.edit`] = role === "staff" && page !== "settings";
  }
  if (role === "staff") {
    perms["inventory.view_selling_price"] = true;
    perms["finance.send_reminder"] = true;
    perms["payments.approve_payment"] = true;
  } else {
    perms["inventory.view_selling_price"] = true;
  }
  return perms;
}

// ─── Tree CRUD ────────────────────────────────────────────────────────────────

async function roleDepth(roleId: string): Promise<number> {
  let depth = 1;
  let currentId: string | null = roleId;
  while (currentId && depth <= MAX_TREE_DEPTH + 1) {
    const role: { parentId: string | null } | null = await prisma.role.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!role?.parentId) break;
    depth++;
    currentId = role.parentId;
  }
  return depth;
}

export async function listRoles() {
  const roles = await prisma.role.findMany({
    orderBy: [{ createdAt: "asc" }],
    include: { _count: { select: { users: true, children: true } } },
  });
  return roles;
}

export async function createRole(input: { name: string; parent_id?: string | null }) {
  const name = input.name.trim();
  if (!name) {
    throw Object.assign(new Error("กรุณาระบุชื่อ role"), { statusCode: 400 });
  }

  if (input.parent_id) {
    const parent = await prisma.role.findUnique({ where: { id: input.parent_id } });
    if (!parent) {
      throw Object.assign(new Error("ไม่พบ role แม่"), { statusCode: 404 });
    }
    const parentDepth = await roleDepth(parent.id);
    if (parentDepth >= MAX_TREE_DEPTH) {
      throw Object.assign(
        new Error(`role tree ลึกได้สูงสุด ${MAX_TREE_DEPTH} ชั้น`),
        { statusCode: 422 }
      );
    }
  }

  try {
    const role = await prisma.role.create({
      data: { name, parentId: input.parent_id ?? null },
    });
    return role;
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      throw Object.assign(new Error(`มี role ชื่อ "${name}" อยู่แล้ว`), { statusCode: 409 });
    }
    throw err;
  }
}

export async function updateRole(id: string, input: { name?: string }) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw Object.assign(new Error("ไม่พบ role"), { statusCode: 404 });
  if (role.isSystem) {
    throw Object.assign(new Error("แก้ไข role ระบบไม่ได้"), { statusCode: 422 });
  }
  const updated = await prisma.role.update({
    where: { id },
    data: { ...(input.name ? { name: input.name.trim() } : {}) },
  });
  invalidatePermissionCache();
  return updated;
}

export async function deleteRole(id: string) {
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true, children: true } } },
  });
  if (!role) throw Object.assign(new Error("ไม่พบ role"), { statusCode: 404 });
  if (role.isSystem) {
    throw Object.assign(new Error("ลบ role ระบบไม่ได้"), { statusCode: 422 });
  }
  if (role._count.users > 0) {
    throw Object.assign(
      new Error(`ลบไม่ได้ — มีผู้ใช้ ${role._count.users} คนอยู่ใน role นี้`),
      { statusCode: 422 }
    );
  }
  if (role._count.children > 0) {
    throw Object.assign(
      new Error(`ลบไม่ได้ — มี sub-role ${role._count.children} ตัวอยู่ใต้ role นี้`),
      { statusCode: 422 }
    );
  }
  await prisma.role.delete({ where: { id } });
  invalidatePermissionCache();
  return { success: true };
}

/**
 * Replace the full explicit permission matrix of a role.
 * The editor loads effective (inherited) values and saves the whole matrix,
 * so a saved role no longer changes when its parent changes.
 */
export async function setRolePermissions(
  roleId: string,
  entries: Array<{ page: PermissionPage; action: string; allow: boolean }>
) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw Object.assign(new Error("ไม่พบ role"), { statusCode: 404 });
  if (role.isSystem) {
    throw Object.assign(new Error("role ระบบมีสิทธิ์ทุกอย่างเสมอ แก้ไขไม่ได้"), {
      statusCode: 422,
    });
  }

  const validKeys = new Set(allPermissionKeys());
  for (const e of entries) {
    if (!validKeys.has(`${e.page}.${e.action}`)) {
      throw Object.assign(new Error(`สิทธิ์ไม่ถูกต้อง: ${e.page}.${e.action}`), {
        statusCode: 400,
      });
    }
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: entries.map((e) => ({ roleId, page: e.page, action: e.action, allow: e.allow })),
    }),
  ]);
  invalidatePermissionCache();
  return getEffectivePermissions(roleId);
}

import { prisma } from "../../lib/prisma.js";
import type { PermissionPage, BulkUpdatePermissionsInput } from "./permissions.schemas.js";
import { PERMISSION_PAGES } from "./permissions.schemas.js";

export interface PermissionDto {
  page: PermissionPage;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Default permission sets per role
export const DEFAULT_PERMISSIONS: Record<
  "staff" | "viewer",
  Record<PermissionPage, Omit<PermissionDto, "page">>
> = {
  staff: {
    dashboard: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    inventory: { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    receiving:  { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    sales:      { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    customers:  { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    finance:    { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    payments:   { canView: true,  canCreate: true,  canEdit: true,  canDelete: false },
    settings:   { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  viewer: {
    dashboard: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    inventory: { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    receiving:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    sales:      { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    customers:  { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    finance:    { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    payments:   { canView: true,  canCreate: false, canEdit: false, canDelete: false },
    settings:   { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

// All permissions granted (used for admin responses)
function allGranted(): Omit<PermissionDto, "page"> {
  return { canView: true, canCreate: true, canEdit: true, canDelete: true };
}

/**
 * Create default UserPermission rows for a newly created user.
 * Admin users are skipped — they have implicit full access.
 */
export async function createDefaultPermissions(
  userId: string,
  role: "admin" | "staff" | "viewer"
): Promise<void> {
  if (role === "admin") return;

  const defaults = DEFAULT_PERMISSIONS[role];
  await prisma.userPermission.createMany({
    data: PERMISSION_PAGES.map((page) => ({
      userId,
      page,
      ...defaults[page],
    })),
    skipDuplicates: true,
  });
}

/**
 * Return the permissions for a given user.
 * If the user is admin, return all-granted for every page.
 */
export async function getUserPermissions(userId: string): Promise<PermissionDto[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  if (user.role === "admin") {
    return PERMISSION_PAGES.map((page) => ({ page, ...allGranted() }));
  }

  const rows = await prisma.userPermission.findMany({ where: { userId } });

  // Build a map for quick lookup
  const rowMap = new Map(rows.map((r) => [r.page as PermissionPage, r]));

  // Return one entry per page (fall back to all-false if row is missing)
  return PERMISSION_PAGES.map((page) => {
    const row = rowMap.get(page);
    return {
      page,
      canView:   row?.canView   ?? false,
      canCreate: row?.canCreate ?? false,
      canEdit:   row?.canEdit   ?? false,
      canDelete: row?.canDelete ?? false,
    };
  });
}

/**
 * Bulk-replace the permission rows for a user (admin-only operation).
 * Admin users cannot have permissions stored — they are always implicitly all-granted.
 */
export async function updateUserPermissions(
  userId: string,
  input: BulkUpdatePermissionsInput
): Promise<PermissionDto[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  if (user.role === "admin") {
    throw Object.assign(
      new Error("Admin users have implicit full permissions; stored permissions are not applicable"),
      { statusCode: 422 }
    );
  }

  // Upsert each permission entry in a transaction
  await prisma.$transaction(
    input.permissions.map(({ page, canView, canCreate, canEdit, canDelete }) =>
      prisma.userPermission.upsert({
        where: { userId_page: { userId, page } },
        create: { userId, page, canView, canCreate, canEdit, canDelete },
        update: { canView, canCreate, canEdit, canDelete },
      })
    )
  );

  return getUserPermissions(userId);
}

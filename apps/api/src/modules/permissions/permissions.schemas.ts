import { z } from "zod";

export const PERMISSION_PAGES = [
  "dashboard",
  "inventory",
  "receiving",
  "sales",
  "customers",
  "finance",
  "payments",
  "settings",
] as const;

export type PermissionPage = (typeof PERMISSION_PAGES)[number];
export type PermissionAction = "canView" | "canCreate" | "canEdit" | "canDelete";

export const permissionEntrySchema = z.object({
  page: z.enum(PERMISSION_PAGES),
  canView: z.boolean(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
});

export const bulkUpdatePermissionsSchema = z.object({
  permissions: z.array(permissionEntrySchema).min(1),
});

export type BulkUpdatePermissionsInput = z.infer<typeof bulkUpdatePermissionsSchema>;

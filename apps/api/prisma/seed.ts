import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSION_PAGES = [
  "dashboard",
  "inventory",
  "receiving",
  "sales",
  "customers",
  "finance",
  "payments",
  "settings",
] as const;

type PermissionPage = (typeof PERMISSION_PAGES)[number];

const DEFAULT_PERMISSIONS: Record<
  "staff" | "viewer",
  Record<PermissionPage, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>
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

async function seedPermissionsForUser(userId: string, role: "admin" | "staff" | "viewer") {
  if (role === "admin") return; // Admins have implicit full access

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

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@csyfinproj.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "Admin",
        role: "admin",
      },
    });
    console.log(`Created admin user: ${admin.email} (id: ${admin.id})`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // Seed permissions for all existing non-admin users
  const nonAdminUsers = await prisma.user.findMany({
    where: { role: { not: "admin" } },
    select: { id: true, role: true, email: true },
  });

  for (const user of nonAdminUsers) {
    await seedPermissionsForUser(user.id, user.role as "staff" | "viewer");
    console.log(`Seeded permissions for user: ${user.email} (role: ${user.role})`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

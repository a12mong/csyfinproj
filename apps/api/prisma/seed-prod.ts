/**
 * Production seed — ปลอดภัยสำหรับเครื่องจริง:
 *   - ไม่ลบข้อมูลใด ๆ (ใช้ upsert ทั้งหมด รันซ้ำได้)
 *   - ไม่สร้างข้อมูลทดสอบ/ลูกค้าปลอม
 *
 * สิ่งที่สร้าง:
 *   1. Role tree เริ่มต้น: Admin (ระบบ) / Staff / Viewer + สิทธิ์ default
 *   2. ผู้ใช้ admin คนแรก (อีเมล/รหัสจาก env: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD)
 *   3. สถาบันการเงินเริ่มต้น (แก้/เพิ่มทีหลังได้ในระบบ)
 *
 * วิธีรัน (ผ่าน SSH tunnel — ดู docs/setup-guide.md Phase 8):
 *   DATABASE_URL="mysql://..." \
 *   SEED_ADMIN_EMAIL="owner@example.com" \
 *   SEED_ADMIN_PASSWORD="รหัสยาว ๆ" \
 *     pnpm --filter @csyfinproj/api seed:prod
 */
import { PrismaClient, type PermissionPage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PAGES: PermissionPage[] = [
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

async function upsertRole(name: string, isSystem: boolean) {
  return prisma.role.upsert({
    where: { name },
    create: { name, isSystem },
    update: {},
  });
}

async function setRolePermissions(roleId: string, perms: Record<string, boolean>) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({
    data: Object.entries(perms).map(([key, allow]) => {
      const [page, ...rest] = key.split(".");
      return { roleId, page: page as PermissionPage, action: rest.join("."), allow };
    }),
  });
}

async function main() {
  // ── 1) Roles ────────────────────────────────────────────────────────────────
  const admin = await upsertRole("Admin", true);
  const staff = await upsertRole("Staff", false);
  const viewer = await upsertRole("Viewer", false);

  const staffPerms: Record<string, boolean> = {};
  for (const p of PAGES) {
    staffPerms[`${p}.view`] = true;
    staffPerms[`${p}.edit`] = p !== "settings";
  }
  staffPerms["inventory.view_cost_price"] = false;
  staffPerms["inventory.view_selling_price"] = true;
  staffPerms["customers.view_pii"] = false;
  staffPerms["finance.send_reminder"] = true;
  staffPerms["payments.approve_payment"] = true;

  const viewerPerms: Record<string, boolean> = {};
  for (const p of PAGES) {
    viewerPerms[`${p}.view`] = true;
    viewerPerms[`${p}.edit`] = false;
  }
  viewerPerms["inventory.view_cost_price"] = false;
  viewerPerms["inventory.view_selling_price"] = true;
  viewerPerms["customers.view_pii"] = false;
  viewerPerms["finance.send_reminder"] = false;
  viewerPerms["payments.approve_payment"] = false;

  await setRolePermissions(staff.id, staffPerms);
  await setRolePermissions(viewer.id, viewerPerms);
  console.log("✓ Roles: Admin (ระบบ) / Staff / Viewer พร้อมสิทธิ์ default");

  // ── 2) Admin user ───────────────────────────────────────────────────────────
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ต้องกำหนด SEED_ADMIN_EMAIL และ SEED_ADMIN_PASSWORD (ยาวอย่างน้อย 8 ตัว) ก่อนรัน"
    );
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD ต้องยาวอย่างน้อย 8 ตัวอักษร");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      username: "admin",
      email,
      passwordHash,
      name: "Administrator",
      role: "admin",
      roleId: admin.id,
    },
    // มีอยู่แล้ว: อัปเดตรหัส + ผูก role admin ให้ (ใช้ reset รหัส admin ได้ด้วย)
    update: { username: "admin", passwordHash, role: "admin", roleId: admin.id, active: true },
  });
  console.log(`✓ Admin user: ${email}`);

  // ── 3) Financial institutions ──────────────────────────────────────────────
  const institutions = [
    { name: "ธนาคารกรุงศรีอยุธยา (Krungsri)", code: "BAY" },
    { name: "ธนาคารไทยพาณิชย์ (SCB)", code: "SCB" },
    { name: "ธนาคารกสิกรไทย (KBANK)", code: "KBANK" },
    { name: "อิออน (AEON)", code: "AEON" },
  ];
  for (const inst of institutions) {
    await prisma.financialInstitution.upsert({
      where: { code: inst.code },
      create: inst,
      update: {},
    });
  }
  console.log(`✓ Financial institutions: ${institutions.map((i) => i.code).join(", ")}`);

  console.log("\nเสร็จสิ้น — login ด้วยบัญชี admin แล้วสร้างผู้ใช้/role เพิ่มในหน้า ตั้งค่า");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Full DEV seed — ล้างข้อมูลทั้งหมดแล้วสร้างข้อมูลตัวอย่างครบทุกตาราง/ฟีเจอร์:
 * roles + สิทธิ์, ผู้ใช้, ตั้งค่าระบบ, ลูกค้า (พร้อม consent/LINE link code),
 * รับสินค้า, สต็อก, การขาย (เงินสด/ผ่อน/ไฟแนนซ์ พร้อมส่วนลด), สัญญา + งวด,
 * การชำระ (รวมเคสค้างบางส่วน/ชำระล่วงหน้า/เกินกำหนด), ใบกำกับภาษี,
 * ประวัติแจ้งเตือน + batch, audit log ตัวอย่าง
 *
 * 🔴 ห้ามรันกับเครื่อง production — ใช้ seed-prod.ts แทน
 */
import {
  PrismaClient,
  UserRole,
  MotorcycleStatus,
  PaymentMethod,
  PaymentChannel,
  SaleStatus,
  InstallmentStatus,
  NotificationChannel,
  NotificationStatus,
  ContractStatus,
  DeliveryItemType,
  DeliveryNoteStatus,
  type PermissionPage,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { fakerTH, fakerEN } from "@faker-js/faker";

const prisma = new PrismaClient();
const faker = fakerTH;
const fakerEn = fakerEN;

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

function randomIdCard() {
  return faker.string.numeric(13);
}

const LINK_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomLinkCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += LINK_CODE_ALPHABET[Math.floor(Math.random() * LINK_CODE_ALPHABET.length)];
  }
  return code;
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
  console.log("Starting DB seed...");

  console.log("Cleaning up existing database records...");
  await prisma.auditLog.deleteMany({});
  await prisma.notificationBatchItem.deleteMany({});
  await prisma.notificationBatch.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.taxInvoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.installment.deleteMany({});
  await prisma.contractSale.deleteMany({});
  await prisma.contractParty.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.saleAddon.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.motorcycle.deleteMany({});
  await prisma.deliveryNoteItem.deleteMany({});
  await prisma.deliveryNote.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.addon.deleteMany({});
  await prisma.userPermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.systemSetting.deleteMany({});
  await prisma.financialInstitution.deleteMany({});
  console.log("Cleanup completed.");

  // ── 1. Roles + permissions (Admin/Staff/Viewer + ตัวอย่าง sub-role Manager) ──
  console.log("Seeding roles...");
  const adminRole = await prisma.role.create({ data: { name: "Admin", isSystem: true } });
  const staffRole = await prisma.role.create({ data: { name: "Staff" } });
  const viewerRole = await prisma.role.create({ data: { name: "Viewer" } });
  const managerRole = await prisma.role.create({
    data: { name: "Manager", parentId: staffRole.id },
  });

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

  // Manager สืบทอดจาก Staff แต่เห็นราคาทุน + ข้อมูลส่วนบุคคลเต็มได้
  const managerPerms: Record<string, boolean> = {
    ...staffPerms,
    "inventory.view_cost_price": true,
    "customers.view_pii": true,
  };

  await setRolePermissions(staffRole.id, staffPerms);
  await setRolePermissions(viewerRole.id, viewerPerms);
  await setRolePermissions(managerRole.id, managerPerms);

  // ── 2. Users ────────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@csyfinproj.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminHash,
      name: "Admin Supachai",
      role: "admin",
      roleId: adminRole.id,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  const passwordHash = await bcrypt.hash("Password123!", 12);
  const mockUsersData = [
    { email: "staff1@csyfinproj.local", name: faker.person.fullName(), role: "staff" as UserRole, roleId: managerRole.id },
    { email: "staff2@csyfinproj.local", name: faker.person.fullName(), role: "staff" as UserRole, roleId: staffRole.id },
    { email: "viewer1@csyfinproj.local", name: faker.person.fullName(), role: "viewer" as UserRole, roleId: viewerRole.id },
  ];

  const dbUsers = [];
  for (const u of mockUsersData) {
    const user = await prisma.user.create({
      data: { email: u.email, name: u.name, role: u.role, roleId: u.roleId, passwordHash },
    });
    dbUsers.push(user);
  }

  // ── 3. System settings ─────────────────────────────────────────────────────
  console.log("Seeding system settings...");
  const settings: Array<[string, string]> = [
    ["line_oa_basic_id", "@400rbdse"],
    ["date_format", "buddhist"],
    ["decimal_places", "2"],
    ["audit_retention_days", "365"],
    ["customer_erasure_lock_years", "5"],
  ];
  for (const [key, value] of settings) {
    await prisma.systemSetting.create({ data: { key, value } });
  }

  // ── 4. Financial institutions ──────────────────────────────────────────────
  console.log("Seeding financial institutions...");
  const financialInstitutions = [
    { name: "กรุงศรี ออโต้ (Krungsri Auto)", code: "BAY", active: true },
    { name: "ธนาคารไทยพาณิชย์ (SCB)", code: "SCB", active: true },
    { name: "ธนาคารกสิกรไทย (KBANK)", code: "KBANK", active: true },
    { name: "อิออน (AEON)", code: "AEON", active: true },
  ];
  const dbFis = [];
  for (const fi of financialInstitutions) {
    dbFis.push(await prisma.financialInstitution.create({ data: fi }));
  }

  // ── 5. Addons (สินค้า/บริการเสริม) ──────────────────────────────────────────
  const addonsData = [
    { name: "พ.ร.บ. จักรยานยนต์", description: "Compulsory motor insurance", price: 323, active: true, costPrice: 280, stockQty: 100, type: "service" as const },
    { name: "จดทะเบียน/ต่อภาษี", description: "Registration / Tax", price: 500, active: true, costPrice: 400, stockQty: 100, type: "service" as const },
    { name: "ประกันรถหาย 1 ปี", description: "Lost bike insurance - 1 year", price: 1500, active: true, costPrice: 1200, stockQty: 100, type: "service" as const },
    { name: "หมวกกันน็อคเต็มใบ", description: "Full-face helmet", price: 1200, active: true, costPrice: 800, stockQty: 45, type: "accessory" as const },
  ];
  const dbAddons = [];
  for (const a of addonsData) {
    dbAddons.push(await prisma.addon.create({ data: a }));
  }

  // ── 6. Customers (พร้อม consent PDPA + ตัวอย่าง LINE) ───────────────────────
  console.log("Seeding customers...");
  const dbCustomers = [];
  for (let i = 0; i < 20; i++) {
    const hasLine = i < 4; // 4 คนแรกเชื่อม LINE แล้ว (demo ปุ่มส่งแจ้งเตือน)
    const hasPendingCode = i >= 4 && i < 6; // 2 คนมีรหัสเชื่อมค้างอยู่
    const customer = await prisma.customer.create({
      data: {
        name: faker.person.fullName(),
        phone: faker.phone.number({ style: "national" }),
        email: faker.helpers.maybe(() => faker.internet.email()),
        lineId: hasLine ? `U${fakerEn.string.alphanumeric({ length: 31, casing: "lower" })}` : null,
        isLineLinked: hasLine,
        lineLinkCode: hasPendingCode ? randomLinkCode() : null,
        lineLinkCodeExpiresAt: hasPendingCode ? new Date(Date.now() + 24 * 3600e3) : null,
        address: faker.location.streetAddress() + ", " + faker.location.city(),
        idCardNumber: randomIdCard(),
        consentAcceptedAt: faker.date.recent({ days: 90 }),
      },
    });
    dbCustomers.push(customer);
  }

  // ── 7. Delivery notes → motorcycles ────────────────────────────────────────
  console.log("Seeding receiving + stock...");
  for (let i = 0; i < 3; i++) {
    const note = await prisma.deliveryNote.create({
      data: {
        noteNumber: `DN-${faker.date.past().getFullYear()}-${faker.string.numeric(4)}`,
        supplierName: "Thai Yamaha Motor Co., Ltd.",
        receivedDate: faker.date.recent({ days: 60 }),
        receivedByUserId: admin.id,
        status: DeliveryNoteStatus.verified,
      },
    });

    const itemTypes = ["Fino 125", "NMAX 155", "XMAX 300", "Grand Filano", "MT-15"];
    for (let j = 0; j < 2; j++) {
      const item = await prisma.deliveryNoteItem.create({
        data: {
          deliveryNoteId: note.id,
          itemType: DeliveryItemType.motorcycle,
          description: faker.helpers.arrayElement(itemTypes),
          quantity: faker.number.int({ min: 3, max: 10 }),
          unitCost: faker.number.int({ min: 40000, max: 150000 }),
        },
      });
      for (let k = 0; k < item.quantity; k++) {
        await prisma.motorcycle.create({
          data: {
            brand: "Yamaha",
            model: item.description,
            year: new Date().getFullYear(),
            chassisNumber: `MLH${fakerEn.string.alphanumeric({ length: 14, casing: "upper" })}`,
            engineNumber: `E31${fakerEn.string.alphanumeric({ length: 7, casing: "upper" })}`,
            color: faker.helpers.arrayElement(["Black", "White", "Red", "Blue", "Gray"]),
            costPrice: item.unitCost,
            sellingPrice: Number(item.unitCost) * 1.25,
            status: MotorcycleStatus.in_stock,
            deliveryNoteItemId: item.id,
          },
        });
      }
    }
  }

  const dbMotorcycles = await prisma.motorcycle.findMany();

  // ── 8. Sales / contracts / installments / payments / tax invoices ─────────
  console.log("Seeding sales + contracts...");
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const staffIds = dbUsers.map((u) => u.id);
  const customersForSales = faker.helpers.arrayElements(dbCustomers, 12);
  const motorcyclesForSales = faker.helpers.arrayElements(dbMotorcycles, 12);
  const installmentContracts: Array<{ contractId: string; customerId: string }> = [];

  for (let s = 0; s < 12; s++) {
    const paymentGroup = Math.floor(s / 4); // 0=cash, 1=installment, 2=finance
    const salePrice = Number(motorcyclesForSales[s].sellingPrice);
    // บางรายการมีส่วนลด (demo ฟีเจอร์ส่วนลด)
    const discount = s % 3 === 0 ? faker.helpers.arrayElement([1000, 2000, 3000]) : 0;
    const netPrice = round2(salePrice - discount);

    let paymentMethod: PaymentMethod;
    let financeCompanyName: string | null = null;
    let financialInstitutionId: string | null = null;
    let downPayment: number;
    let numInstallments: number;
    let interestRate: number;

    if (paymentGroup === 0) {
      paymentMethod = PaymentMethod.cash;
      downPayment = netPrice;
      numInstallments = 0;
      interestRate = 0;
    } else if (paymentGroup === 1) {
      paymentMethod = PaymentMethod.installment;
      downPayment = faker.number.int({ min: 5000, max: 20000 });
      numInstallments = faker.helpers.arrayElement([12, 18, 24, 36]);
      interestRate = faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 2 });
    } else {
      paymentMethod = PaymentMethod.finance_company;
      downPayment = faker.number.int({ min: 5000, max: 20000 });
      numInstallments = faker.helpers.arrayElement([12, 18, 24, 36]);
      interestRate = faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 2 });
      const fi = faker.helpers.arrayElement(dbFis);
      financialInstitutionId = fi.id;
      financeCompanyName = fi.name;
    }

    const customer = customersForSales[s];
    const mc = motorcyclesForSales[s];

    await prisma.motorcycle.update({
      where: { id: mc.id },
      data: { status: MotorcycleStatus.sold },
    });

    const financeAmount = paymentMethod === PaymentMethod.cash ? 0 : round2(netPrice - downPayment);

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        motorcycleId: mc.id,
        saleDate: faker.date.recent({ days: 90 }),
        totalPrice: salePrice,
        discountAmount: discount,
        downPayment,
        financeAmount,
        numInstallments,
        interestRate,
        paymentMethod,
        financeCompanyName,
        financialInstitutionId: financialInstitutionId ?? null,
        status: paymentMethod === PaymentMethod.cash ? SaleStatus.completed : SaleStatus.active,
        soldByUserId: faker.helpers.arrayElement(staffIds),
      },
    });

    const addonsToInclude = faker.helpers.arrayElements(dbAddons, faker.number.int({ min: 1, max: 3 }));
    for (const addon of addonsToInclude) {
      await prisma.saleAddon.create({
        data: { saleId: sale.id, addonId: addon.id, priceAtSale: addon.price },
      });
    }

    if (paymentMethod === PaymentMethod.cash) {
      // ขายเงินสด: จ่ายครบทันที + ออกใบกำกับภาษี (VAT รวมในราคา)
      const payment = await prisma.payment.create({
        data: {
          saleId: sale.id,
          amount: netPrice,
          paymentDate: sale.saleDate,
          paymentChannel: PaymentChannel.cash,
          verified: true,
          verifiedByUserId: admin.id,
          notes: "Cash payment for motorcycle sale",
        },
      });
      const beforeVat = round2(netPrice / 1.07);
      await prisma.taxInvoice.create({
        data: {
          invoiceNumber: `TXN-${sale.saleDate.toISOString().slice(0, 10).replace(/-/g, "")}-${faker.string.numeric(4)}`,
          saleId: sale.id,
          paymentId: payment.id,
          customerId: customer.id,
          type: "motorcycle",
          amount: beforeVat,
          vatAmount: round2(netPrice - beforeVat),
          totalAmount: netPrice,
          issuedAt: sale.saleDate,
        },
      });
    } else {
      // ผ่อน/ไฟแนนซ์: สัญญา + คู่สัญญา + ตารางงวดแบบลดต้นลดดอก (EMI)
      const P = financeAmount;
      const r = interestRate / 12 / 100;
      const factor = Math.pow(1 + r, numInstallments);
      const emi = round2((P * r * factor) / (factor - 1));

      // คำนวณดอกเบี้ยรวมจากตารางจริง (สอดคล้อง computeEmiTotals ฝั่ง API)
      let totalInterest = 0;
      let remaining = P;
      for (let i = 1; i <= numInstallments; i++) {
        const interest = round2(remaining * r);
        const principalPart = i === numInstallments ? round2(remaining) : round2(emi - interest);
        totalInterest = round2(totalInterest + interest);
        remaining = round2(remaining - principalPart);
      }
      const totalAmount = round2(P + totalInterest);

      const contract = await prisma.contract.create({
        data: {
          contractNumber: `CT-${faker.string.numeric(6)}`,
          customerId: customer.id,
          totalPrincipal: P,
          totalInterest,
          totalAmount,
          numInstallments,
          interestRate,
          startDate: sale.saleDate,
          financialInstitutionId: financialInstitutionId ?? null,
          status: ContractStatus.active,
          createdByUserId: sale.soldByUserId,
        },
      });
      await prisma.contractSale.create({ data: { contractId: contract.id, saleId: sale.id } });

      // คู่สัญญา 2 ฝ่าย (ผ่อนกับร้าน) / 3 ฝ่าย (ไฟแนนซ์)
      await prisma.contractParty.createMany({
        data: [
          { contractId: contract.id, role: "buyer", partyName: customer.name, partyRefId: customer.id, partyRefType: "customer" },
          { contractId: contract.id, role: "seller", partyName: "ร้านค้า (CSY)" },
          ...(paymentMethod === PaymentMethod.finance_company
            ? [{ contractId: contract.id, role: "owner" as const, partyName: financeCompanyName ?? "Finance", partyRefId: financialInstitutionId, partyRefType: "financial_institution" }]
            : []),
        ],
      });

      if (paymentMethod === PaymentMethod.installment) {
        installmentContracts.push({ contractId: contract.id, customerId: customer.id });
      }

      remaining = P;
      for (let i = 1; i <= numInstallments; i++) {
        const dueDate = new Date(sale.saleDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const interest = round2(remaining * r);
        const principalPart = i === numInstallments ? round2(remaining) : round2(emi - interest);
        const amountDue = i === numInstallments ? round2(principalPart + interest) : emi;
        remaining = round2(remaining - principalPart);

        const isPaid = i <= 2;
        const inst = await prisma.installment.create({
          data: {
            saleId: sale.id,
            contractId: contract.id,
            installmentNumber: i,
            dueDate,
            amountDue,
            principalPortion: principalPart,
            interestPortion: interest,
            remainingBalance: remaining,
            amountPaid: isPaid ? amountDue : 0,
            status: isPaid ? InstallmentStatus.paid : InstallmentStatus.pending,
            paidAt: isPaid ? new Date(dueDate.getTime() - faker.number.int({ min: 86400000, max: 5 * 86400000 })) : null,
          },
        });

        if (isPaid) {
          await prisma.payment.create({
            data: {
              installmentId: inst.id,
              contractId: contract.id,
              amount: amountDue,
              paymentDate: inst.paidAt!,
              paymentChannel: PaymentChannel.bank_transfer,
              verified: true,
              verifiedByUserId: admin.id,
            },
          });
        } else if (i === 3) {
          await prisma.notificationLog.create({
            data: {
              customerId: customer.id,
              installmentId: inst.id,
              channel: NotificationChannel.line,
              message: `แจ้งเตือนการชำระค่างวด งวดที่ ${i} จำนวน ${amountDue.toFixed(2)} บาท`,
              status: NotificationStatus.sent,
              sentAt: new Date(),
            },
          });
        }
      }
    }
  }

  // ── 9. เคสพิเศษของงวดชำระ (demo การแสดงผลหน้าการเงิน/รับชำระ) ────────────────
  console.log("Seeding partial/overdue/advance payment scenarios...");
  const now = Date.now();
  const pickInstallment = async (contractIdx: number, num: number) => {
    const c = installmentContracts[contractIdx % installmentContracts.length];
    return prisma.installment.findFirst({
      where: { contractId: c.contractId, installmentNumber: num },
    });
  };

  // 9.1 ค้างชำระบางส่วน + เลยกำหนด (ต้องติดตาม)
  const carried = await pickInstallment(0, 3);
  if (carried) {
    const paid = round2(Number(carried.amountDue) * 0.3);
    await prisma.installment.update({
      where: { id: carried.id },
      data: {
        dueDate: new Date(now - 10 * 86400000),
        amountPaid: paid,
        status: InstallmentStatus.partially_paid,
      },
    });
    await prisma.payment.create({
      data: {
        installmentId: carried.id,
        contractId: carried.contractId,
        amount: paid,
        paymentDate: new Date(now - 12 * 86400000),
        paymentChannel: PaymentChannel.cash,
        verified: true,
        verifiedByUserId: admin.id,
        notes: "ชำระบางส่วน (ตัวอย่างยอดคงค้าง)",
      },
    });
  }

  // 9.2 ชำระล่วงหน้าบางส่วน (ยังไม่ถึงกำหนด — ไม่ใช่ปัญหา)
  const advance = await pickInstallment(1, 3);
  if (advance) {
    await prisma.installment.update({
      where: { id: advance.id },
      data: {
        dueDate: new Date(now + 20 * 86400000),
        amountPaid: 1000,
        status: InstallmentStatus.partially_paid,
      },
    });
    await prisma.payment.create({
      data: {
        installmentId: advance.id,
        contractId: advance.contractId,
        amount: 1000,
        paymentDate: new Date(now - 1 * 86400000),
        paymentChannel: PaymentChannel.bank_transfer,
        verified: false,
        notes: "ชำระล่วงหน้า (ตัวอย่าง)",
      },
    });
  }

  // 9.3 เกินกำหนดเต็มงวด
  const overdue = await pickInstallment(2, 3);
  if (overdue) {
    await prisma.installment.update({
      where: { id: overdue.id },
      data: { dueDate: new Date(now - 5 * 86400000), status: InstallmentStatus.overdue },
    });
  }

  // 9.4 งวดครบกำหนดวันนี้ (การ์ด Due Today)
  const dueToday = await pickInstallment(3, 4);
  if (dueToday) {
    await prisma.installment.update({
      where: { id: dueToday.id },
      data: { dueDate: new Date() },
    });
  }

  // ── 10. Notification batch ตัวอย่าง (ประวัติการส่งแจ้งเตือนแบบกลุ่ม) ──────────
  console.log("Seeding notification batch...");
  const batchInstallments = await prisma.installment.findMany({
    where: { status: { in: ["pending", "partially_paid"] } },
    take: 3,
    include: {
      contract: { select: { contractNumber: true, customer: { select: { id: true, name: true } } } },
    },
  });
  if (batchInstallments.length > 0) {
    await prisma.notificationBatch.create({
      data: {
        source: "manual",
        channel: NotificationChannel.sms,
        status: "completed",
        totalCount: batchInstallments.length,
        sentCount: batchInstallments.length,
        failedCount: 0,
        createdByUserId: admin.id,
        startedAt: new Date(now - 3600e3),
        completedAt: new Date(now - 3600e3 + 5000),
        items: {
          create: batchInstallments.map((inst) => ({
            installmentId: inst.id,
            customerId: inst.contract?.customer?.id ?? null,
            customerName: inst.contract?.customer?.name ?? null,
            contractNumber: inst.contract?.contractNumber ?? null,
            amount: round2(Number(inst.amountDue) - Number(inst.amountPaid)),
            channel: NotificationChannel.sms,
            status: NotificationStatus.sent,
            sentAt: new Date(now - 3600e3 + 3000),
          })),
        },
      },
    });
  }

  // ── 11. Audit log ตัวอย่าง ─────────────────────────────────────────────────
  console.log("Seeding sample audit logs...");
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, userName: admin.email, action: "post", entity: "auth", summary: "สร้าง/ดำเนินการ การเข้าสู่ระบบ (login)", statusCode: 200 },
      { userId: admin.id, userName: admin.email, action: "put", entity: "settings", entityId: "decimal_places", summary: "แก้ไข การตั้งค่า (decimal_places)", statusCode: 200 },
      { userId: admin.id, userName: admin.email, action: "post", entity: "sales", summary: "สร้าง/ดำเนินการ รายการขาย", statusCode: 201 },
      { action: "link", entity: "customers", summary: `ลูกค้า "${dbCustomers[0].name}" เชื่อมบัญชี LINE ผ่านรหัสในแชท OA` },
    ],
  });

  console.log("Mock data generation completed successfully!");
  console.log(`  admin: ${adminEmail} / ${adminPassword === "Admin1234!" ? "Admin1234!" : "(จาก env)"}`);
  console.log("  staff1 (Manager) / staff2 (Staff) / viewer1 (Viewer): Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

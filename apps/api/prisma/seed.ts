import { PrismaClient, UserRole, MotorcycleStatus, PaymentMethod, PaymentChannel, SaleStatus, InstallmentStatus, NotificationChannel, NotificationStatus, ContractStatus, DeliveryItemType, DeliveryNoteStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fakerTH, fakerEN } from "@faker-js/faker";

const prisma = new PrismaClient();
const faker = fakerTH;
const fakerEn = fakerEN;

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

function randomIdCard() {
  return faker.string.numeric(13);
}

async function main() {
  console.log("Starting DB seed...");

  // 1. Users
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@csyfinproj.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "Admin Supachai",
        role: "admin",
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  }

  // Create Staff and Viewers
  const mockUsersData = [
    { email: "staff1@csyfinproj.local", name: faker.person.fullName(), role: "staff" as UserRole },
    { email: "staff2@csyfinproj.local", name: faker.person.fullName(), role: "staff" as UserRole },
    { email: "viewer1@csyfinproj.local", name: faker.person.fullName(), role: "viewer" as UserRole },
  ];

  const dbUsers = [];
  const passwordHash = await bcrypt.hash("Password123!", 12);

  for (const u of mockUsersData) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
        }
      });
      await seedPermissionsForUser(user.id, user.role as "staff" | "viewer");
    }
    dbUsers.push(user);
  }

  // 2. Addons
  const addonsData = [
    { name: "พ.ร.บ. จักรยานยนต์", description: "Compulsory motor insurance", price: 323, active: true },
    { name: "จดทะเบียน/ต่อภาษี", description: "Registration / Tax", price: 500, active: true },
    { name: "ประกันรถหาย 1 ปี", description: "Lost bike insurance - 1 year", price: 1500, active: true },
    { name: "หมวกกันน็อคเต็มใบ", description: "Full-face helmet", price: 1200, active: true },
  ];

  const dbAddons = [];
  for (const a of addonsData) {
    const addon = await prisma.addon.create({
      data: a
    });
    dbAddons.push(addon);
  }

  // 3. Customers
  const dbCustomers = [];
  for (let i = 0; i < 20; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: faker.person.fullName(),
        phone: faker.phone.number({ style: 'national' }),
        email: faker.helpers.maybe(() => faker.internet.email()),
        lineId: faker.helpers.maybe(() => faker.internet.username()),
        address: faker.location.streetAddress() + ", " + faker.location.city(),
        idCardNumber: randomIdCard(),
      }
    });
    dbCustomers.push(customer);
  }

  // 4. Delivery Notes & Items (Batches of incoming motorcycles)
  const deliveryNotes = [];
  for (let i = 0; i < 3; i++) {
    const note = await prisma.deliveryNote.create({
      data: {
        noteNumber: `DN-${faker.date.past().getFullYear()}-${faker.string.numeric(4)}`,
        supplierName: "Thai Yamaha Motor Co., Ltd.",
        receivedDate: faker.date.recent({ days: 60 }),
        receivedByUserId: admin.id,
        status: DeliveryNoteStatus.verified,
      }
    });
    
    const itemTypes = ["Fino 125", "NMAX 155", "XMAX 300", "Grand Filano", "MT-15"];
    for(let j = 0; j < 2; j++) {
       const item = await prisma.deliveryNoteItem.create({
         data: {
           deliveryNoteId: note.id,
           itemType: DeliveryItemType.motorcycle,
           description: faker.helpers.arrayElement(itemTypes),
           quantity: faker.number.int({ min: 3, max: 10 }),
           unitCost: faker.number.int({ min: 40000, max: 150000 }),
         }
       });
       // Create the motorcycles for this batch immediately to be able to link properly
       for (let k = 0; k < item.quantity; k++) {
         await prisma.motorcycle.create({
           data: {
             brand: "Yamaha",
             model: item.description,
             year: new Date().getFullYear(),
             chassisNumber: `MLH${fakerEn.string.alphanumeric({ length: 14, casing: 'upper' })}`,
             engineNumber: `E31${fakerEn.string.alphanumeric({ length: 7, casing: 'upper' })}`,
             color: faker.helpers.arrayElement(["Black", "White", "Red", "Blue", "Gray"]),
             costPrice: item.unitCost,
             sellingPrice: Number(item.unitCost) * 1.25,
             status: MotorcycleStatus.in_stock,
             deliveryNoteItemId: item.id,
           }
         });
       }
    }
    deliveryNotes.push(note);
  }

  const dbMotorcycles = await prisma.motorcycle.findMany();

  // 6. Sales, Contracts, SaleAddons, Installments, Payments
  // Generate test data for all 3 payment methods for TDS-57 testing
  const staffIds = dbUsers.map(u => u.id);
  const customersForSales = faker.helpers.arrayElements(dbCustomers, 12);
  const motorcyclesForSales = faker.helpers.arrayElements(dbMotorcycles, 12);

  for (let s = 0; s < 12; s++) {
    // Divide 12 sales into 3 groups:
    // Group 1 (s=0-3): Cash Payment
    // Group 2 (s=4-7): In-house Installment (payment_method = installment)
    // Group 3 (s=8-11): Finance Company (payment_method = finance_company)
    const paymentGroup = Math.floor(s / 4);
    let paymentMethod: PaymentMethod;
    let financeCompanyName: string | null = null;
    let downPayment: number;
    let numInstallments: number;
    let interestRate: number;

    const salePrice = Number(motorcyclesForSales[s].sellingPrice);

    if (paymentGroup === 0) {
      // Cash payment: full amount
      paymentMethod = PaymentMethod.cash;
      downPayment = salePrice;
      numInstallments = 0;
      interestRate = 0;
    } else if (paymentGroup === 1) {
      // In-house installment: payment_method = installment
      paymentMethod = PaymentMethod.installment;
      downPayment = faker.number.int({ min: 5000, max: 20000 });
      numInstallments = faker.helpers.arrayElement([12, 18, 24, 36]);
      interestRate = faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 2 });
    } else {
      // Finance company: payment_method = finance_company
      paymentMethod = PaymentMethod.finance_company;
      downPayment = faker.number.int({ min: 5000, max: 20000 });
      numInstallments = faker.helpers.arrayElement([12, 18, 24, 36]);
      interestRate = faker.number.float({ min: 1.5, max: 2.5, fractionDigits: 2 });
      financeCompanyName = faker.helpers.arrayElement([
        "กรุงศรีออโต้",
        "ธนชาติ",
        "CSY Financing",
        "ไทยพาณิชย์"
      ]);
    }

    const customer = customersForSales[s];
    const mc = motorcyclesForSales[s];

    await prisma.motorcycle.update({
      where: { id: mc.id },
      data: { status: MotorcycleStatus.sold }
    });

    const financeAmount = salePrice - downPayment;

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        motorcycleId: mc.id,
        saleDate: faker.date.recent({ days: 30 }),
        totalPrice: salePrice,
        downPayment,
        financeAmount,
        numInstallments,
        interestRate,
        paymentMethod,
        financeCompanyName,
        status: SaleStatus.active,
        soldByUserId: faker.helpers.arrayElement(staffIds),
      }
    });

    const addonsToInclude = faker.helpers.arrayElements(dbAddons, faker.number.int({ min: 1, max: 3 }));
    for (const addon of addonsToInclude) {
      await prisma.saleAddon.create({
        data: {
          saleId: sale.id,
          addonId: addon.id,
          priceAtSale: addon.price,
        }
      });
    }

    // Only create contract and installments for installment/finance_company sales
    if (paymentMethod !== PaymentMethod.cash) {
      const totalInterest = financeAmount * (interestRate / 100) * numInstallments;
      const totalAmount = financeAmount + totalInterest;

      const contract = await prisma.contract.create({
        data: {
          contractNumber: `CT-${faker.string.numeric(6)}`,
          customerId: customer.id,
          totalPrincipal: financeAmount,
          totalInterest,
          totalAmount,
          numInstallments,
          interestRate,
          startDate: sale.saleDate,
          status: ContractStatus.active,
          createdByUserId: sale.soldByUserId,
        }
      });

      await prisma.contractSale.create({
        data: { contractId: contract.id, saleId: sale.id }
      });

      const monthlyInstallment = totalAmount / numInstallments;

      for (let i = 1; i <= numInstallments; i++) {
        const dueDate = new Date(sale.saleDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        const isPaid = i <= 2;

        const inst = await prisma.installment.create({
          data: {
             saleId: sale.id,
             contractId: contract.id,
             installmentNumber: i,
             dueDate: dueDate,
             amountDue: monthlyInstallment,
             amountPaid: isPaid ? monthlyInstallment : 0,
             status: isPaid ? InstallmentStatus.paid : InstallmentStatus.pending,
             paidAt: isPaid ? new Date(dueDate.getTime() - faker.number.int({min: 86400000, max: 5*86400000})) : null,
          }
        });

        if (isPaid) {
          await prisma.payment.create({
            data: {
              installmentId: inst.id,
              contractId: contract.id,
              amount: monthlyInstallment,
              paymentDate: inst.paidAt!,
              paymentChannel: PaymentChannel.bank_transfer,
              verified: true,
              verifiedByUserId: admin.id,
            }
          });
        } else if (i === 3) {
          await prisma.notificationLog.create({
            data: {
              customerId: customer.id,
              installmentId: inst.id,
              channel: NotificationChannel.line,
              message: `แจ้งเตือนการชำระค่างวด งวดที่ ${i} จำนวน ${monthlyInstallment.toFixed(2)} บาท`,
              status: NotificationStatus.sent,
              sentAt: new Date(),
            }
          });
        }
      }
    }
  }

  console.log("Mock data generation completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

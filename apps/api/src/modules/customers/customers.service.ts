import { prisma } from "../../lib/prisma.js";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customers.schemas.js";

export async function createCustomer(input: CreateCustomerInput) {
  const existing = await prisma.customer.findUnique({
    where: { idCardNumber: input.id_card_number },
  });

  if (existing) {
    throw Object.assign(new Error("Customer with this ID card already exists"), {
      statusCode: 409,
    });
  }

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone,
      idCardNumber: input.id_card_number,
      email: input.email,
      lineId: input.line_id,
      address: input.address,
      ...(input.type && { type: input.type }),
      ...(input.consent_accepted && { consentAcceptedAt: new Date() }),
    },
  });

  return { data: customer };
}

export async function listCustomers(options: {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 10, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options.search) {
    where.OR = [
      { name: { contains: options.search } },
      { phone: { contains: options.search } },
      { idCardNumber: { contains: options.search } },
    ];
  }

  if (options.type) {
    const types = options.type.split(",").map((t) => t.trim()).filter(Boolean);
    if (types.length > 0) {
      where.type = { in: types };
    }
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page };
}

export async function getCustomerDetail(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  }

  // Calculate debt summary
  const sales = await prisma.sale.findMany({
    where: { customerId: id },
    include: { installments: true },
  });

  let totalDebt = 0;
  let paidAmount = 0;
  let overdueCount = 0;

  for (const sale of sales) {
    for (const installment of sale.installments) {
      totalDebt += Number(installment.amountDue);
      paidAmount += Number(installment.amountPaid);

      if (new Date(installment.dueDate) < new Date() && Number(installment.amountPaid) < Number(installment.amountDue)) {
        overdueCount++;
      }
    }
  }

  return {
    data: {
      ...customer,
      total_debt: totalDebt,
      paid_amount: paidAmount,
      overdue_count: overdueCount,
      totalDebt,
      paidAmount,
      overdueCount,
    },
  };
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.phone && { phone: input.phone }),
      ...(input.email && { email: input.email }),
      ...(input.line_id && { lineId: input.line_id }),
      ...(input.address && { address: input.address }),
      ...(input.type && { type: input.type }),
    },
  });

  return { data: updated };
}

export async function linkCustomerLine(id: string, lineId: string, linePictureUrl?: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      lineId,
      isLineLinked: true,
      linePictureUrl: linePictureUrl || null,
    },
  });

  return { data: updated };
}

// Unambiguous alphabet (no 0/O/1/I/L) for link codes typed or scanned by customers
const LINK_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LINK_CODE_LENGTH = 6;
const LINK_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function randomLinkCode(): string {
  let code = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += LINK_CODE_ALPHABET[Math.floor(Math.random() * LINK_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Generate (or regenerate) a short-lived LINE link code for a customer.
 * The customer sends this code to the LINE OA chat; the webhook matches it
 * and binds their LINE userId to this record — no LINE Login required.
 */
export async function generateLineLinkCode(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  }

  // Retry on the (unlikely) unique-collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomLinkCode();
    try {
      const updated = await prisma.customer.update({
        where: { id },
        data: {
          lineLinkCode: code,
          lineLinkCodeExpiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
        },
      });
      return {
        data: {
          code: updated.lineLinkCode,
          expires_at: updated.lineLinkCodeExpiresAt,
        },
      };
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code !== "P2002") throw err; // P2002 = unique violation → retry
    }
  }
  throw Object.assign(new Error("Failed to generate link code"), { statusCode: 500 });
}

/**
 * Match a link code sent into the LINE OA chat and bind the sender's LINE
 * userId to the customer record. Returns the customer, or null if the code
 * is unknown/expired.
 */
export async function linkCustomerByCode(code: string, lineUserId: string, linePictureUrl?: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      lineLinkCode: code.toUpperCase(),
      lineLinkCodeExpiresAt: { gt: new Date() },
    },
  });
  if (!customer) return null;

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      lineId: lineUserId,
      isLineLinked: true,
      linePictureUrl: linePictureUrl || null,
      lineLinkCode: null,
      lineLinkCodeExpiresAt: null,
    },
  });
  return updated;
}

/**
 * PDPA right-to-erasure: anonymize a customer record. Financial records
 * (sales/contracts/payments) are preserved; personal identifiers are wiped.
 * Blocked while the customer has activity within the configured lock period.
 */
export async function anonymizeCustomer(id: string, lockYears: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: { orderBy: { saleDate: "desc" }, take: 1, select: { saleDate: true } },
      contracts: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  if (!customer) {
    throw Object.assign(new Error("ไม่พบลูกค้า"), { statusCode: 404 });
  }
  if (customer.anonymizedAt) {
    throw Object.assign(new Error("ลูกค้ารายนี้ถูกปกปิดข้อมูลไปแล้ว"), { statusCode: 422 });
  }

  const lastActivity = [
    customer.sales[0]?.saleDate,
    customer.contracts[0]?.createdAt,
    customer.createdAt,
  ]
    .filter(Boolean)
    .map((d) => new Date(d as Date).getTime())
    .reduce((a, b) => Math.max(a, b), 0);

  const lockMs = lockYears * 365 * 24 * 60 * 60 * 1000;
  const unlockDate = new Date(lastActivity + lockMs);
  if (Date.now() < unlockDate.getTime()) {
    throw Object.assign(
      new Error(
        `ยังลบไม่ได้ตามนโยบายเก็บข้อมูล ${lockYears} ปี — ลบได้หลัง ${unlockDate.toISOString().slice(0, 10)}`
      ),
      { statusCode: 422 }
    );
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: "ลูกค้าถูกปกปิดข้อมูล",
      phone: "-",
      email: null,
      address: null,
      lineId: null,
      isLineLinked: false,
      linePictureUrl: null,
      lineLinkCode: null,
      lineLinkCodeExpiresAt: null,
      // idCardNumber is unique+required — replace with a non-identifying placeholder
      idCardNumber: `ANON${Date.now().toString().slice(-9)}`,
      anonymizedAt: new Date(),
    },
  });
  return { data: updated };
}

export async function unlinkCustomerLine(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      lineId: null,
      isLineLinked: false,
      linePictureUrl: null,
    },
  });

  return { data: updated };
}

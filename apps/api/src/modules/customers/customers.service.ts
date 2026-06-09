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

export async function linkCustomerLine(id: string, lineId: string) {
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
    },
  });

  return { data: updated };
}

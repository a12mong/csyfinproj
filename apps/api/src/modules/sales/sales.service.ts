import { prisma } from "../../lib/prisma.js";
import type { CreateSaleInput, UpdateSaleInput } from "./sales.schemas.js";

export async function createSale(input: CreateSaleInput, userId: string) {
  const financeAmount = input.total_price - input.down_payment;

  // Create the sale
  const sale = await prisma.sale.create({
    data: {
      customerId: input.customer_id,
      motorcycleId: input.motorcycle_id,
      saleDate: new Date(),
      totalPrice: input.total_price,
      downPayment: input.down_payment,
      financeAmount,
      numInstallments: input.num_installments,
      interestRate: input.interest_rate,
      paymentMethod: input.payment_method,
      financeCompanyName: input.finance_company_name ?? null,
      financeReferenceNumber: input.finance_reference_number ?? null,
      soldByUserId: userId,
      notes: input.notes,
      status: "active",
    },
  });

  // Generate installment schedule only for dealer-managed installment payments
  // finance_company payment: finance company handles installments, not the dealer
  const installments = [];
  if (input.payment_method === "installment" && input.num_installments > 0) {
    // Total interest = financeAmount * (interestRate / 100) * (numInstallments / 12)
    const totalInterest =
      financeAmount * (input.interest_rate / 100) * (input.num_installments / 12);
    const totalRepayable = financeAmount + totalInterest;
    const monthlyAmount = Math.round((totalRepayable / input.num_installments) * 100) / 100;

    for (let i = 1; i <= input.num_installments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      const installment = await prisma.installment.create({
        data: {
          saleId: sale.id,
          installmentNumber: i,
          dueDate,
          amountDue: monthlyAmount,
          status: "pending",
        },
      });

      installments.push(installment);
    }
  }

  // Attach add-ons if provided
  let saleAddons: { id: string; name: string; description: string | null; price: unknown; active: boolean; createdAt: Date }[] = [];
  if (input.addon_ids && input.addon_ids.length > 0) {
    const addons = await prisma.addon.findMany({
      where: { id: { in: input.addon_ids } },
    });

    for (const addon of addons) {
      await prisma.saleAddon.create({
        data: {
          saleId: sale.id,
          addonId: addon.id,
          priceAtSale: addon.price,
        },
      });
    }

    saleAddons = addons;
  }

  // Update motorcycle status to sold
  await prisma.motorcycle.update({
    where: { id: input.motorcycle_id },
    data: { status: "sold" },
  });

  return {
    data: {
      ...sale,
      installments,
      addons: saleAddons,
    },
  };
}

export async function listSales(options: {
  status?: string;
  customer_id?: string;
  payment_method?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 10, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options.status) {
    where.status = options.status;
  }

  if (options.customer_id) {
    where.customerId = options.customer_id;
  }

  if (options.payment_method) {
    where.paymentMethod = options.payment_method;
  }

  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      include: { customer: true, motorcycle: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.count({ where }),
  ]);

  return { data, total, page };
}

export async function getSaleDetail(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      motorcycle: true,
      installments: { orderBy: { installmentNumber: "asc" } },
      saleAddons: { include: { addon: true } },
    },
  });

  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }

  return {
    data: {
      ...sale,
      addons: sale.saleAddons.map((sa) => sa.addon),
    },
  };
}

export async function updateSale(id: string, input: UpdateSaleInput) {
  const sale = await prisma.sale.findUnique({
    where: { id },
  });

  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.notes && { notes: input.notes }),
    },
    include: {
      customer: true,
      motorcycle: true,
      installments: { orderBy: { installmentNumber: "asc" } },
      saleAddons: { include: { addon: true } },
    },
  });

  return {
    data: {
      ...updated,
      addons: updated.saleAddons.map((sa) => sa.addon),
    },
  };
}

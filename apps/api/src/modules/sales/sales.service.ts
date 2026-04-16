import { prisma } from "../../lib/prisma.js";
import type { CreateSaleInput, UpdateSaleInput } from "./sales.schemas.js";

export async function createSale(input: CreateSaleInput, userId: string) {
  const effectiveInvoiceCustomerId = input.invoice_customer_id ?? input.customer_id!;

  // Load invoice customer to determine type for conditional validation
  const invoiceCustomer = await prisma.customer.findUnique({
    where: { id: effectiveInvoiceCustomerId },
  });
  if (!invoiceCustomer) {
    throw Object.assign(new Error("Invoice customer not found"), { statusCode: 404 });
  }

  // When payment is cash and invoice customer is a finance company, a personal/individual buyer is required
  if (input.payment_method === "cash" && invoiceCustomer.type === "finance") {
    if (!input.buyer_customer_id) {
      throw Object.assign(
        new Error("buyer_customer_id is required when payment_method is cash and invoice customer type is finance"),
        { statusCode: 400 }
      );
    }
    const buyerCustomer = await prisma.customer.findUnique({
      where: { id: input.buyer_customer_id },
    });
    if (!buyerCustomer) {
      throw Object.assign(new Error("Buyer customer not found"), { statusCode: 404 });
    }
    if (buyerCustomer.type !== "personal" && buyerCustomer.type !== "individual") {
      throw Object.assign(
        new Error("Buyer customer must be type personal or individual"),
        { statusCode: 400 }
      );
    }
  }

  const financeAmount = input.total_price - input.down_payment;

  // Create the sale — installment details (count, interest) are specified later
  // when linking this sale to a contract
  const sale = await prisma.sale.create({
    data: {
      customerId: effectiveInvoiceCustomerId,
      invoiceCustomerId: effectiveInvoiceCustomerId,
      buyerCustomerId: input.buyer_customer_id ?? null,
      motorcycleId: input.motorcycle_id,
      saleDate: new Date(),
      totalPrice: input.total_price,
      downPayment: input.down_payment,
      financeAmount,
      numInstallments: 0,
      interestRate: 0,
      paymentMethod: input.payment_method,
      financeCompanyName: input.finance_company_name ?? null,
      financeReferenceNumber: input.finance_reference_number ?? null,
      financialInstitutionId: input.financial_institution_id ?? null,
      soldByUserId: userId,
      notes: input.notes,
      status: input.payment_method === "cash" ? "completed" : "active",
    },
  });

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
      installments: [],
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
      include: {
        customer: { select: { id: true, name: true, phone: true, type: true } },
        invoiceCustomer: { select: { id: true, name: true, phone: true, type: true } },
        buyerCustomer: { select: { id: true, name: true, phone: true, type: true } },
        motorcycle: true,
      },
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
      customer: { select: { id: true, name: true, phone: true, type: true } },
      invoiceCustomer: { select: { id: true, name: true, phone: true, type: true } },
      buyerCustomer: { select: { id: true, name: true, phone: true, type: true } },
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
      customer: { select: { id: true, name: true, phone: true, type: true } },
      invoiceCustomer: { select: { id: true, name: true, phone: true, type: true } },
      buyerCustomer: { select: { id: true, name: true, phone: true, type: true } },
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

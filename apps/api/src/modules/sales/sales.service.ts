import { prisma } from "../../lib/prisma.js";
import type { CreateSaleInput, UpdateSaleInput } from "./sales.schemas.js";
import { createTaxInvoice } from "../payments/invoices.service.js";

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

  const result = await prisma.$transaction(async (tx) => {
    // Check motorcycle status
    const motorcycle = await tx.motorcycle.findUnique({
      where: { id: input.motorcycle_id },
    });
    if (!motorcycle) {
      throw Object.assign(new Error("Motorcycle not found"), { statusCode: 404 });
    }
    if (motorcycle.status === "sold") {
      throw Object.assign(new Error("Motorcycle is already sold"), { statusCode: 400 });
    }

    // Resolve Finance Company customer if payment method is finance_company and name is provided
    let resolvedInvoiceCustomerId = effectiveInvoiceCustomerId;
    if (input.payment_method === "finance_company" && invoiceCustomer.type !== "finance" && input.finance_company_name) {
      let financeCustomer = await tx.customer.findFirst({
        where: {
          name: input.finance_company_name,
          type: "finance",
        },
      });

      if (!financeCustomer) {
        financeCustomer = await tx.customer.create({
          data: {
            name: input.finance_company_name,
            type: "finance",
            phone: "—",
            address: "—",
            idCardNumber: "—",
          },
        });
      }
      resolvedInvoiceCustomerId = financeCustomer.id;
    }

    // Attach add-ons if provided, and check/decrement stock
    let saleAddons: { addon: any; billingOption: string }[] = [];
    const addonDetailsMap = new Map<string, { billingOption: string }>();
    if (input.addons && input.addons.length > 0) {
      for (const item of input.addons) {
        addonDetailsMap.set(item.id, { billingOption: item.billing_option });
      }
    } else if (input.addon_ids && input.addon_ids.length > 0) {
      for (const id of input.addon_ids) {
        addonDetailsMap.set(id, { billingOption: "pay_separately" });
      }
    }

    const allAddonIds = Array.from(addonDetailsMap.keys());
    if (allAddonIds.length > 0) {
      const addons = await tx.addon.findMany({
        where: { id: { in: allAddonIds } },
      });

      const foundAddonIds = addons.map((a) => a.id);
      const missingAddonIds = allAddonIds.filter((id) => !foundAddonIds.includes(id));
      if (missingAddonIds.length > 0) {
        throw Object.assign(
          new Error(`Some addons were not found: ${missingAddonIds.join(", ")}`),
          { statusCode: 404 }
        );
      }

      for (const addon of addons) {
        if (addon.type === "part" || addon.type === "accessory") {
          if (addon.stockQty < 1) {
            throw Object.assign(
              new Error(`Addon "${addon.name}" is out of stock`),
              { statusCode: 400 }
            );
          }
          await tx.addon.update({
            where: { id: addon.id },
            data: { stockQty: { decrement: 1 } },
          });
        }
        const details = addonDetailsMap.get(addon.id)!;
        saleAddons.push({ addon, billingOption: details.billingOption });
      }
    }

    // Net price after discount — discount is applied before down payment / financing
    const discount = input.discount_amount ?? 0;
    if (discount >= input.total_price) {
      throw Object.assign(new Error("ส่วนลดต้องน้อยกว่าราคาสินค้า"), { statusCode: 400 });
    }
    const netPrice = input.total_price - discount;
    if (input.down_payment > netPrice) {
      throw Object.assign(new Error("เงินดาวน์ต้องไม่เกินราคาหลังหักส่วนลด"), { statusCode: 400 });
    }

    // Calculate finance amount (including addons with 'included_in_finance' billing option)
    const baseFinanceAmount = netPrice - input.down_payment;
    const addonsFinanceAmount = saleAddons
      .filter((sa) => sa.billingOption === "included_in_finance")
      .reduce((sum, sa) => sum + Number(sa.addon.price), 0);
    const totalFinanceAmount = baseFinanceAmount + addonsFinanceAmount;

    // Create the sale
    const sale = await tx.sale.create({
      data: {
        customerId: input.buyer_customer_id ?? effectiveInvoiceCustomerId,
        invoiceCustomerId: resolvedInvoiceCustomerId,
        buyerCustomerId: input.buyer_customer_id ?? effectiveInvoiceCustomerId,
        motorcycleId: input.motorcycle_id,
        saleDate: new Date(),
        totalPrice: input.total_price,
        discountAmount: discount,
        downPayment: input.down_payment,
        financeAmount: totalFinanceAmount,
        numInstallments: 0,
        interestRate: 0,
        paymentMethod: input.payment_method,
        financeCompanyName: input.finance_company_name ?? null,
        financeReferenceNumber: input.finance_reference_number ?? null,
        commissionAmount: input.commission_amount ?? null,
        financialInstitutionId: input.financial_institution_id ?? null,
        soldByUserId: userId,
        notes: input.notes,
        status: input.payment_method === "cash" ? "completed" : "active",
      },
    });

    // Handle payment creation and tax invoice generation based on payment method
    if (input.payment_method === "cash") {
      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          amount: netPrice,
          paymentDate: new Date(),
          paymentChannel: "cash",
          verified: true,
          verifiedByUserId: userId,
          notes: "Cash payment for motorcycle sale",
        },
      });

      await createTaxInvoice(tx, {
        saleId: sale.id,
        paymentId: payment.id,
        customerId: input.buyer_customer_id ?? effectiveInvoiceCustomerId,
        type: "motorcycle",
        totalAmount: netPrice,
      });
    } else if (input.payment_method === "installment") {
      if (input.down_payment > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: input.down_payment,
            paymentDate: new Date(),
            paymentChannel: "cash",
            verified: false,
            notes: "Pending down payment for installment sale",
          },
        });
      }
    } else if (input.payment_method === "finance_company") {
      if (input.down_payment > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: input.down_payment,
            paymentDate: new Date(),
            paymentChannel: "cash",
            verified: false,
            notes: "Pending down payment from customer",
          },
        });
      }

      if (totalFinanceAmount > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: totalFinanceAmount,
            paymentDate: new Date(),
            paymentChannel: "bank_transfer",
            verified: false,
            notes: `Pending payout from finance company (includes addons): ${input.finance_company_name ?? ""}`,
          },
        });
      }

      if (input.commission_amount && input.commission_amount > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: input.commission_amount,
            paymentDate: new Date(),
            paymentChannel: "bank_transfer",
            verified: false,
            notes: "Pending commission payout from finance company",
          },
        });
      }
    }

    // Create addon payments for addons paid separately
    for (const sa of saleAddons) {
      if (sa.billingOption === "pay_separately") {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            addonId: sa.addon.id,
            amount: sa.addon.price,
            paymentDate: new Date(),
            paymentChannel: "cash",
            verified: false,
            notes: `Pending payment for add-on: ${sa.addon.name}`,
          },
        });
      }
    }

    // Link sale with addons
    if (saleAddons.length > 0) {
      for (const sa of saleAddons) {
        await tx.saleAddon.create({
          data: {
            saleId: sale.id,
            addonId: sa.addon.id,
            priceAtSale: sa.billingOption === "free_gift" ? 0 : sa.addon.price,
            billingOption: sa.billingOption,
          },
        });
      }
    }

    // Update motorcycle status to sold
    await tx.motorcycle.update({
      where: { id: input.motorcycle_id },
      data: { status: "sold" },
    });

    return { sale, addons: saleAddons.map((sa) => sa.addon) };
  });

  return {
    data: {
      ...result.sale,
      installments: [],
      addons: result.addons,
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
      installments: {
        orderBy: { installmentNumber: "asc" },
        include: {
          payments: {
            include: { taxInvoices: true },
          },
        },
      },
      saleAddons: { include: { addon: true } },
      contractSales: {
        include: {
          contract: {
            include: {
              installments: {
                orderBy: { installmentNumber: "asc" },
                include: {
                  payments: {
                    include: { taxInvoices: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sale) {
    throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
  }

  // Resolve installments: if direct installments exist, use them.
  // Otherwise, check linked contracts and use their installments.
  let resolvedInstallments = sale.installments;
  let linkedContract = null;
  if (sale.contractSales && sale.contractSales.length > 0) {
    const firstContractSale = sale.contractSales[0];
    if (firstContractSale.contract) {
      linkedContract = firstContractSale.contract;
      if (resolvedInstallments.length === 0 && linkedContract.installments) {
        resolvedInstallments = linkedContract.installments as any;
      }
    }
  }

  // Fetch all tax invoices for this sale
  // Includes sale-level invoices AND all payment-level invoices for this sale/contract installments
  const paymentIds = resolvedInstallments.flatMap((inst) => 
    inst.payments ? inst.payments.map((p) => p.id) : []
  );

  const taxInvoices = await prisma.taxInvoice.findMany({
    where: {
      OR: [
        { saleId: id },
        ...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : []),
      ],
    },
    orderBy: { issuedAt: "asc" },
  });

  return {
    data: {
      ...sale,
      installments: resolvedInstallments,
      linkedContract: linkedContract ? {
        id: linkedContract.id,
        contractNumber: linkedContract.contractNumber,
        status: linkedContract.status,
      } : null,
      addons: sale.saleAddons.map((sa) => ({
        ...sa.addon,
        priceAtSale: Number(sa.priceAtSale),
        billingOption: sa.billingOption,
      })),
      taxInvoices,
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

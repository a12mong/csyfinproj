import { prisma } from "../../lib/prisma.js";
import type { CreatePaymentInput, VerifyPaymentInput, ListPaymentsQuery } from "./payments.schemas.js";
import { createTaxInvoice } from "./invoices.service.js";
import { sendPaymentConfirmation } from "../notifications/notifications.service.js";

export async function listPayments(query: ListPaymentsQuery) {
  const { installment_id, contract_id, contract_number, sale_id, payment_channel, verified, date, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (installment_id) {
    where.installmentId = installment_id;
  }
  if (contract_id) {
    where.contractId = contract_id;
  }
  if (contract_number) {
    where.contract = { contractNumber: { contains: contract_number, mode: "insensitive" } };
  }
  if (sale_id) {
    where.OR = [
      { contract: { contractSales: { some: { saleId: sale_id } } } },
      { installment: { saleId: sale_id } },
      { saleId: sale_id },
    ];
  }
  if (payment_channel) {
    where.paymentChannel = payment_channel;
  }
  if (verified !== undefined) {
    where.verified = verified;
  }
  if (date) {
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59.999`);
    where.paymentDate = { gte: startOfDay, lte: endOfDay };
  }

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: {
        installment: {
          include: {
            sale: {
              include: { customer: true },
            },
          },
        },
        contract: {
          select: { id: true, contractNumber: true, customer: { select: { id: true, name: true } } },
        },
        verifiedBy: { select: { id: true, name: true } },
        taxInvoices: true,
      },
      orderBy: [
        { paymentDate: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page };
}

export async function recordPayment(input: CreatePaymentInput) {
  if (input.payment_channel === "bank_transfer" && !input.slip_image) {
    throw Object.assign(
      new Error("Slip image is required for bank_transfer payments"),
      { statusCode: 400 }
    );
  }

  const paymentDate = new Date(input.payment_date);

  // 1. Direct Sale Payment (Down payments/cash sales)
  if (input.sale_id && !input.contract_id && !input.installment_id) {
    const sale = await prisma.sale.findUnique({
      where: { id: input.sale_id },
    });
    if (!sale) {
      throw Object.assign(new Error("Sale not found"), { statusCode: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        saleId: input.sale_id,
        amount: input.amount,
        paymentDate,
        paymentChannel: input.payment_channel ?? "cash",
        slipImageUrl: input.slip_image,
        notes: input.notes,
        verified: false,
      },
    });
    return { data: payment };
  }

  // 2. Installment/Contract Payment (with sequential allocation)
  let contractId = input.contract_id;
  let targetInstallmentId = input.installment_id;

  if (targetInstallmentId && !contractId) {
    const inst = await prisma.installment.findUnique({
      where: { id: targetInstallmentId },
    });
    if (!inst) {
      throw Object.assign(new Error("Installment not found"), { statusCode: 404 });
    }
    contractId = inst.contractId ?? undefined;
  }

  if (!contractId && !targetInstallmentId) {
    throw Object.assign(
      new Error("Either installment_id, contract_id, or sale_id is required"),
      { statusCode: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    if (contractId) {
      const openInstallments = await tx.installment.findMany({
        where: {
          contractId,
          status: { in: ["pending", "overdue", "partially_paid"] },
        },
        orderBy: { dueDate: "asc" },
      });

      if (openInstallments.length === 0) {
        throw Object.assign(
          new Error("No open installments found for this contract"),
          { statusCode: 422 }
        );
      }

      // Money math must stay on satang precision — raw float accumulation
      // leaves the last installment a hair short of "paid"
      const round2 = (n: number) => Math.round(n * 100) / 100;

      let remainingAmount = round2(input.amount);
      const paymentsCreated = [];

      for (const inst of openInstallments) {
        if (remainingAmount <= 0) break;

        const due = Number(inst.amountDue);
        const paid = Number(inst.amountPaid);
        const outstanding = round2(due - paid);

        if (outstanding <= 0) continue;

        const applyAmount = Math.min(remainingAmount, outstanding);
        remainingAmount = round2(remainingAmount - applyAmount);

        const payment = await tx.payment.create({
          data: {
            installmentId: inst.id,
            contractId,
            amount: applyAmount,
            paymentDate,
            paymentChannel: input.payment_channel ?? "cash",
            slipImageUrl: input.slip_image,
            notes: input.notes,
            verified: false,
          },
        });

        const totalPaid = round2(paid + applyAmount);
        const newStatus =
          totalPaid >= due
            ? "paid"
            : totalPaid > 0
              ? "partially_paid"
              : "pending";

        await tx.installment.update({
          where: { id: inst.id },
          data: {
            amountPaid: totalPaid,
            status: newStatus,
            ...(newStatus === "paid" && { paidAt: new Date() }),
          },
        });

        paymentsCreated.push(payment);
      }

      // If there is excess payment amount, apply it to the last installment
      if (remainingAmount > 0) {
        const lastInst = openInstallments[openInstallments.length - 1];
        if (lastInst) {
          const payment = await tx.payment.create({
            data: {
              installmentId: lastInst.id,
              contractId,
              amount: remainingAmount,
              paymentDate,
              paymentChannel: input.payment_channel ?? "cash",
              slipImageUrl: input.slip_image,
              notes: input.notes ? `${input.notes} (Excess payment)` : "Excess payment",
              verified: false,
            },
          });

          const totalPaid = round2(Number(lastInst.amountPaid) + remainingAmount);
          await tx.installment.update({
            where: { id: lastInst.id },
            data: {
              amountPaid: totalPaid,
              status: "paid",
              paidAt: new Date(),
            },
          });

          paymentsCreated.push(payment);
        }
      }

      // ปิดสัญญาอัตโนมัติเมื่อไม่มีงวดค้างชำระเหลือ (ผ่อนครบ = ปิดสัญญา + ปิดรายการขาย)
      const openLeft = await tx.installment.count({
        where: {
          contractId,
          status: { in: ["pending", "overdue", "partially_paid"] },
        },
      });
      if (openLeft === 0) {
        await tx.contract.update({
          where: { id: contractId },
          data: { status: "completed" },
        });
        await tx.sale.updateMany({
          where: {
            contractSales: { some: { contractId } },
            paymentMethod: "installment",
          },
          data: { status: "completed" },
        });
      }

      return paymentsCreated[0];
    } else {
      // Direct installment payment without contract link
      const inst = await tx.installment.findUnique({
        where: { id: targetInstallmentId! },
      });
      if (!inst) {
        throw Object.assign(new Error("Installment not found"), { statusCode: 404 });
      }

      const payment = await tx.payment.create({
        data: {
          installmentId: targetInstallmentId,
          amount: input.amount,
          paymentDate,
          paymentChannel: input.payment_channel ?? "cash",
          slipImageUrl: input.slip_image,
          notes: input.notes,
          verified: false,
        },
      });

      const totalPaid = Math.round((Number(inst.amountPaid) + input.amount) * 100) / 100;
      const newStatus =
        totalPaid >= Number(inst.amountDue)
          ? "paid"
          : totalPaid > 0
            ? "partially_paid"
            : "pending";

      await tx.installment.update({
        where: { id: targetInstallmentId! },
        data: {
          amountPaid: totalPaid,
          status: newStatus,
          ...(newStatus === "paid" && { paidAt: new Date() }),
        },
      });

      // Sale-linked installment without a contract: complete the sale when no open installments remain
      if (inst.saleId) {
        const openLeft = await tx.installment.count({
          where: {
            saleId: inst.saleId,
            status: { in: ["pending", "overdue", "partially_paid"] },
          },
        });
        if (openLeft === 0) {
          await tx.sale.update({
            where: { id: inst.saleId },
            data: { status: "completed" },
          });
        }
      }

      return payment;
    }
  }, {
    // Lump-sum payoff (โปะปิดสัญญา) allocates across every open installment —
    // dozens of sequential writes to a remote DB exceed the 5s default
    maxWait: 10000,
    timeout: 60000,
  });

  return { data: result };
}

export async function verifyPayment(id: string, input: VerifyPaymentInput, userId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      installment: {
        include: {
          sale: true,
          contract: {
            include: {
              contractSales: {
                include: {
                  sale: true,
                },
              },
            },
          },
        },
      },
      contract: {
        include: {
          contractSales: {
            include: {
              sale: true,
            },
          },
        },
      },
      sale: true,
    },
  });

  if (!payment) {
    throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id },
      data: {
        verified: input.verified,
        verifiedByUserId: input.verified ? userId : null,
      },
    });

    if (input.verified) {
      // Determine invoice type
      let invoiceType: "motorcycle" | "commission" | "installment" | "addon" | "down_payment" = "installment";
      let sale = payment.sale || payment.installment?.sale;
      if (!sale) {
        const contract = payment.contract || payment.installment?.contract;
        if (contract && contract.contractSales && contract.contractSales.length > 0) {
          sale = contract.contractSales[0].sale;
        }
      }

      if (payment.addonId) {
        invoiceType = "addon";
      } else if (payment.saleId) {
        if (sale?.paymentMethod === "finance_company") {
          if (sale.commissionAmount && Number(payment.amount) === Number(sale.commissionAmount)) {
            invoiceType = "commission";
          } else if (sale.downPayment && Number(payment.amount) === Number(sale.downPayment)) {
            invoiceType = "down_payment";
          } else {
            invoiceType = "motorcycle";
          }
        } else if (sale?.paymentMethod === "installment") {
          invoiceType = "down_payment";
        } else if (sale?.paymentMethod === "cash") {
          invoiceType = "motorcycle";
        }
      }

      // Resolve correct customer ID for the tax invoice
      let customerId = payment.contract?.customerId || payment.installment?.sale?.customerId || payment.sale?.customerId;
      if (!customerId && sale) {
        customerId = sale.buyerCustomerId || sale.customerId;
      }
      
      if (sale) {
        if (sale.paymentMethod === "finance_company") {
          if (invoiceType === "down_payment" || invoiceType === "addon") {
            // Down payment and addons are paid by the actual buyer customer
            customerId = sale.buyerCustomerId || sale.customerId;
          } else {
            // Motorcycle payout and commission are paid by the finance company
            customerId = sale.invoiceCustomerId || sale.customerId;
          }
        } else {
          // Cash and installment: invoices are paid by the buyer customer
          customerId = sale.buyerCustomerId || sale.customerId;
        }
      }

      if (!customerId) {
        throw new Error("Could not resolve customer for tax invoice");
      }

      await createTaxInvoice(tx, {
        saleId: sale?.id ?? null,
        paymentId: payment.id,
        customerId,
        type: invoiceType,
        totalAmount: Number(payment.amount),
      });
    }

    return updated;
  });

  if (input.verified) {
    try {
      await sendPaymentConfirmation(id);
    } catch (err) {
      console.error("[verifyPayment] Notification trigger failed:", err);
    }
  }

  return { data: result };
}

export async function getPaymentDetail(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      installment: {
        include: { sale: { include: { customer: true } } },
      },
      contract: {
        select: {
          id: true,
          contractNumber: true,
          customer: { select: { id: true, name: true } },
        },
      },
      verifiedBy: { select: { id: true, name: true } },
    },
  });

  if (!payment) {
    throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
  }

  return { data: payment };
}

/**
 * Auto-create a payment record from a LINE image message.
 * Finds the customer by lineId, then associates with their oldest pending installment.
 */
export async function createLinePayment(options: {
  lineUserId: string;
  lineMessageId: string;
  slipImageUrl?: string;
}) {
  const { lineUserId, lineMessageId, slipImageUrl } = options;

  const customer = await prisma.customer.findFirst({
    where: { lineId: lineUserId },
  });

  if (!customer) {
    return null;
  }

  // Find the oldest pending/overdue installment for this customer
  const installment = await prisma.installment.findFirst({
    where: {
      sale: { customerId: customer.id },
      status: { in: ["pending", "overdue", "partially_paid"] },
    },
    orderBy: { dueDate: "asc" },
  });

  if (!installment) {
    return null;
  }

  const payment = await prisma.payment.create({
    data: {
      installmentId: installment.id,
      amount: 0,
      paymentDate: new Date(),
      paymentChannel: "line",
      slipImageUrl: slipImageUrl ?? null,
      lineMessageId,
      verified: false,
      notes: "Auto-created from LINE message. Amount pending staff verification.",
    },
  });

  return { data: payment, customer, installment };
}

import { prisma } from "../../lib/prisma.js";
import type { CreatePaymentInput, VerifyPaymentInput, ListPaymentsQuery } from "./payments.schemas.js";

export async function listPayments(query: ListPaymentsQuery) {
  const { installment_id, contract_id, contract_number, sale_id, payment_channel, verified, page, limit } = query;
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
    // Match payments linked to a contract that includes this sale,
    // OR payments linked to an installment that belongs to this sale directly.
    where.OR = [
      { contract: { contractSales: { some: { saleId: sale_id } } } },
      { installment: { saleId: sale_id } },
    ];
  }
  if (payment_channel) {
    where.paymentChannel = payment_channel;
  }
  if (verified !== undefined) {
    where.verified = verified;
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
      },
      orderBy: [
        { paymentChannel: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page };
}

export async function recordPayment(input: CreatePaymentInput) {
  // Determine which installment to apply this payment to.
  let targetInstallmentId: string;

  if (input.installment_id) {
    // Direct installment reference — existing path
    const installment = await prisma.installment.findUnique({
      where: { id: input.installment_id },
    });
    if (!installment) {
      throw Object.assign(new Error("Installment not found"), { statusCode: 404 });
    }
    targetInstallmentId = installment.id;
  } else if (input.contract_id) {
    // Contract reference — find the oldest unpaid installment
    const contract = await prisma.contract.findUnique({
      where: { id: input.contract_id },
    });
    if (!contract) {
      throw Object.assign(new Error("Contract not found"), { statusCode: 404 });
    }

    const oldestInstallment = await prisma.installment.findFirst({
      where: {
        contractId: input.contract_id,
        status: { in: ["pending", "overdue", "partially_paid"] },
      },
      orderBy: { dueDate: "asc" },
    });

    if (!oldestInstallment) {
      throw Object.assign(
        new Error("No open installments found for this contract"),
        { statusCode: 422 }
      );
    }
    targetInstallmentId = oldestInstallment.id;
  } else {
    throw Object.assign(
      new Error("Either installment_id or contract_id is required"),
      { statusCode: 400 }
    );
  }

  // bank_transfer requires a slip image
  if (input.payment_channel === "bank_transfer" && !input.slip_image) {
    throw Object.assign(
      new Error("Slip image is required for bank_transfer payments"),
      { statusCode: 400 }
    );
  }

  const installment = await prisma.installment.findUnique({
    where: { id: targetInstallmentId },
  });

  const payment = await prisma.payment.create({
    data: {
      installmentId: targetInstallmentId,
      contractId: input.contract_id ?? installment?.contractId ?? null,
      amount: input.amount,
      paymentDate: new Date(input.payment_date),
      paymentChannel: input.payment_channel ?? "cash",
      slipImageUrl: input.slip_image,
      notes: input.notes,
      verified: false,
    },
  });

  // Update installment amount paid
  const totalPaid = Number(installment!.amountPaid) + input.amount;
  const newStatus =
    totalPaid >= Number(installment!.amountDue)
      ? "paid"
      : totalPaid > 0
        ? "partially_paid"
        : "pending";

  await prisma.installment.update({
    where: { id: targetInstallmentId },
    data: {
      amountPaid: totalPaid,
      status: newStatus,
      ...(newStatus === "paid" && { paidAt: new Date() }),
    },
  });

  return { data: payment };
}

export async function verifyPayment(id: string, input: VerifyPaymentInput, userId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
  });

  if (!payment) {
    throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      verified: input.verified,
      verifiedByUserId: input.verified ? userId : null,
    },
  });

  return { data: updated };
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

import { prisma } from "../../lib/prisma.js";
import type { CreatePaymentInput, VerifyPaymentInput } from "./payments.schemas.js";

export async function recordPayment(input: CreatePaymentInput) {
  const installment = await prisma.installment.findUnique({
    where: { id: input.installment_id },
  });

  if (!installment) {
    throw Object.assign(new Error("Installment not found"), { statusCode: 404 });
  }

  const payment = await prisma.payment.create({
    data: {
      installmentId: input.installment_id,
      amount: input.amount,
      paymentDate: new Date(input.payment_date),
      slipImageUrl: input.slip_image,
      notes: input.notes,
      verified: false,
    },
  });

  // Update installment amount paid
  const totalPaid = Number(installment.amountPaid) + input.amount;
  const newStatus =
    totalPaid >= Number(installment.amountDue)
      ? "paid"
      : totalPaid > 0
        ? "partially_paid"
        : "pending";

  await prisma.installment.update({
    where: { id: input.installment_id },
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
        include: { sale: true },
      },
    },
  });

  if (!payment) {
    throw Object.assign(new Error("Payment not found"), { statusCode: 404 });
  }

  return { data: payment };
}

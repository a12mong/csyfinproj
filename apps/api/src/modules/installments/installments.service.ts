import { prisma } from "../../lib/prisma.js";

export async function listInstallments(options: {
  sale_id?: string;
  contract_id?: string;
  status?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 10, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (options.sale_id) {
    where.saleId = options.sale_id;
  }

  if (options.contract_id) {
    where.contractId = options.contract_id;
  }

  if (options.overdue) {
    // Filter for installments past their due date that have not been fully paid
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ["paid"] };
  } else if (options.status) {
    where.status = options.status;
  }

  const [data, total] = await Promise.all([
    prisma.installment.findMany({
      where,
      skip,
      take: limit,
      include: {
        sale: {
          include: { customer: true },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.installment.count({ where }),
  ]);

  return { data, total, page };
}

export async function getInstallmentDetail(id: string) {
  const installment = await prisma.installment.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { paymentDate: "asc" } },
      sale: {
        include: {
          customer: true,
          motorcycle: true,
        },
      },
    },
  });

  if (!installment) {
    throw Object.assign(new Error("Installment not found"), { statusCode: 404 });
  }

  return { data: installment };
}

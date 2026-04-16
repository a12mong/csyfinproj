import { prisma } from "../../lib/prisma.js";
import type { CreateContractInput, UpdateContractInput, ListContractsQuery } from "./contracts.schemas.js";

/**
 * Generate a contract number in the format CTR-YYYYMM-NNN.
 * NNN auto-increments per month based on existing contracts.
 */
async function generateContractNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `CTR-${year}${month}-`;

  const lastContract = await prisma.contract.findFirst({
    where: { contractNumber: { startsWith: prefix } },
    orderBy: { contractNumber: "desc" },
  });

  let sequence = 1;
  if (lastContract) {
    const parts = lastContract.contractNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] ?? "0", 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

export async function createContract(input: CreateContractInput, userId: string) {
  const totalInterest =
    input.total_principal * (input.interest_rate / 100) * (input.num_installments / 12);
  const totalAmount = input.total_principal + totalInterest;

  const contractNumber = await generateContractNumber();

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      customerId: input.customer_id,
      totalPrincipal: input.total_principal,
      totalInterest,
      totalAmount,
      numInstallments: input.num_installments,
      interestRate: input.interest_rate,
      startDate: new Date(input.start_date),
      status: "active",
      notes: input.notes ?? null,
      createdByUserId: userId,
    },
  });

  // Link sales to this contract
  if (input.sale_ids && input.sale_ids.length > 0) {
    await Promise.all(
      input.sale_ids.map((saleId) =>
        prisma.contractSale.create({
          data: { contractId: contract.id, saleId },
        })
      )
    );
  }

  // Optionally generate installment schedule
  let installments: object[] = [];
  if (input.generate_installments) {
    installments = await generateInstallmentSchedule(contract.id, {
      totalAmount,
      numInstallments: input.num_installments,
      startDate: new Date(input.start_date),
    });
  }

  const result = await prisma.contract.findUnique({
    where: { id: contract.id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
      contractSales: { include: { sale: true } },
    },
  });

  return { data: { ...result, installments } };
}

async function generateInstallmentSchedule(
  contractId: string,
  options: { totalAmount: number; numInstallments: number; startDate: Date }
) {
  const { totalAmount, numInstallments, startDate } = options;

  // Equal monthly installments, with last installment absorbing rounding difference
  const baseAmount = Math.floor((totalAmount / numInstallments) * 100) / 100;
  const lastAmount =
    Math.round((totalAmount - baseAmount * (numInstallments - 1)) * 100) / 100;

  const installments = [];
  for (let i = 1; i <= numInstallments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const amountDue = i === numInstallments ? lastAmount : baseAmount;

    const installment = await prisma.installment.create({
      data: {
        contractId,
        installmentNumber: i,
        dueDate,
        amountDue,
        status: "pending",
      },
    });

    installments.push(installment);
  }

  return installments;
}

export async function listContracts(query: ListContractsQuery) {
  const { customer_id, status, q, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (customer_id) {
    where.customerId = customer_id;
  }
  if (status) {
    where.status = status;
  }
  if (q) {
    where.contractNumber = { contains: q };
  }

  const [data, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        _count: { select: { installments: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contract.count({ where }),
  ]);

  return { data, total, page };
}

export async function getContractDetail(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
      contractSales: {
        include: {
          sale: {
            include: { motorcycle: true },
          },
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } },
      payments: {
        orderBy: { paymentDate: "desc" },
        include: { verifiedBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!contract) {
    throw Object.assign(new Error("Contract not found"), { statusCode: 404 });
  }

  return { data: contract };
}

export async function updateContract(id: string, input: UpdateContractInput) {
  const contract = await prisma.contract.findUnique({ where: { id } });

  if (!contract) {
    throw Object.assign(new Error("Contract not found"), { statusCode: 404 });
  }

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return { data: updated };
}

export async function generateContractInstallments(id: string) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { _count: { select: { installments: true } } },
  });

  if (!contract) {
    throw Object.assign(new Error("Contract not found"), { statusCode: 404 });
  }

  if (contract._count.installments > 0) {
    throw Object.assign(
      new Error("Installments already exist for this contract. Delete them before regenerating."),
      { statusCode: 409 }
    );
  }

  const installments = await generateInstallmentSchedule(contract.id, {
    totalAmount: Number(contract.totalAmount),
    numInstallments: contract.numInstallments,
    startDate: contract.startDate,
  });

  return { data: installments };
}

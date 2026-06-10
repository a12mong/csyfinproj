import { prisma } from "../../lib/prisma.js";
import type { CreateContractInput, UpdateContractInput, ListContractsQuery } from "./contracts.schemas.js";
import type { Prisma } from "@prisma/client";

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

/**
 * Compute total interest using the declining balance EMI formula to get exact totals
 * that match the per-installment schedule generation.
 */
function computeEmiTotals(
  principal: number,
  annualRate: number,
  numInstallments: number
): { totalInterest: number; totalAmount: number } {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  if (annualRate === 0) {
    return { totalInterest: 0, totalAmount: principal };
  }
  const r = annualRate / 12 / 100;
  const factor = Math.pow(1 + r, numInstallments);
  const emi = round2((principal * r * factor) / (factor - 1));
  // Sum of all EMIs minus principal = total interest
  // Last installment may differ, so compute as total − principal
  let totalInterest = round2(emi * (numInstallments - 1));
  let remaining = principal;
  for (let i = 1; i <= numInstallments; i++) {
    const interest = round2(remaining * r);
    const principalPart = i === numInstallments ? round2(remaining) : round2(emi - interest);
    remaining = round2(remaining - principalPart);
    if (i === numInstallments) {
      totalInterest = round2(totalInterest + interest);
    }
  }
  return { totalInterest, totalAmount: round2(principal + totalInterest) };
}

export async function createContract(input: CreateContractInput, userId: string) {
  // Resolve linked sales upfront (needed for auto-sum and party auto-creation)
  const linkedSales =
    input.sale_ids && input.sale_ids.length > 0
      ? await prisma.sale.findMany({
          where: { id: { in: input.sale_ids } },
          include: {
            customer: true,
            invoiceCustomer: true,
            financialInstitution: true,
          },
        })
      : [];

  // Auto-sum totalPrincipal from linked sales' financeAmount when not explicitly provided
  const resolvedPrincipal =
    input.total_principal ??
    linkedSales.reduce((sum, s) => sum + Number(s.financeAmount), 0);

  if (resolvedPrincipal <= 0) {
    throw Object.assign(
      new Error("total_principal must be positive (computed from linked sales financeAmount)"),
      { statusCode: 400 }
    );
  }

  const { totalInterest, totalAmount } = computeEmiTotals(
    resolvedPrincipal,
    input.interest_rate,
    input.num_installments
  );

  const contractNumber = await generateContractNumber();

  // For installment sales (new 2-party workflow: CSY + customer)
  const installmentSale = linkedSales.find(
    (s) => s.paymentMethod === "installment"
  );

  // For finance_company sales (legacy 3-party workflow), kept for backward compat
  const financeCompanySale = linkedSales.find(
    (s) => s.paymentMethod === "finance_company" && s.financialInstitutionId
  );

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      customerId: input.customer_id,
      totalPrincipal: resolvedPrincipal,
      totalInterest,
      totalAmount,
      numInstallments: input.num_installments,
      interestRate: input.interest_rate,
      startDate: new Date(input.start_date),
      status: "active",
      notes: input.notes ?? null,
      createdByUserId: userId,
      ...(financeCompanySale?.financialInstitutionId && {
        financialInstitutionId: financeCompanySale.financialInstitutionId,
      }),
    },
  });

  // Link sales to this contract
  if (linkedSales.length > 0) {
    await Promise.all(
      linkedSales.map((sale) =>
        prisma.contractSale.create({
          data: { contractId: contract.id, saleId: sale.id },
        })
      )
    );
  }

  // Auto-create ContractParty records based on payment method
  if (installmentSale) {
    // 2-party installment contract: seller (CSY as creditor) + buyer (customer as debtor)
    const parties: Array<{
      contractId: string;
      role: "owner" | "buyer" | "seller";
      partyName: string;
      partyRefId?: string;
      partyRefType?: string;
    }> = [
      // Seller/Creditor: the store (CSY)
      {
        contractId: contract.id,
        role: "seller",
        partyName: "ร้านค้า (CSY)",
        partyRefType: "system",
      },
      // Buyer/Debtor: the customer making the installment contract with CSY
      {
        contractId: contract.id,
        role: "buyer",
        partyName: installmentSale.customer.name,
        partyRefId: installmentSale.customerId,
        partyRefType: "customer",
      },
    ];

    // If the installment sale has a finance-type invoice customer, include them as owner
    if (installmentSale.invoiceCustomer?.type === "finance") {
      parties.push({
        contractId: contract.id,
        role: "owner",
        partyName: installmentSale.invoiceCustomer.name,
        partyRefId: installmentSale.invoiceCustomerId!,
        partyRefType: "customer",
      });
    }

    await Promise.all(parties.map((p) => prisma.contractParty.create({ data: p })));
  } else if (financeCompanySale) {
    // Legacy 3-party finance_company contract: owner (financial institution) + buyer (customer) + seller (CSY)
    const parties: Array<{
      contractId: string;
      role: "owner" | "buyer" | "seller";
      partyName: string;
      partyRefId?: string;
      partyRefType?: string;
    }> = [
      // Owner: the financial institution that holds title
      {
        contractId: contract.id,
        role: "owner",
        partyName:
          financeCompanySale.financialInstitution?.name ??
          financeCompanySale.financeCompanyName ??
          "Financial Institution",
        ...(financeCompanySale.financialInstitutionId && {
          partyRefId: financeCompanySale.financialInstitutionId,
          partyRefType: "financial_institution",
        }),
      },
      // Buyer: the customer who will repay the institution
      {
        contractId: contract.id,
        role: "buyer",
        partyName: financeCompanySale.customer.name,
        partyRefId: financeCompanySale.customerId,
        partyRefType: "customer",
      },
      // Seller: our shop (the system)
      {
        contractId: contract.id,
        role: "seller",
        partyName: "ร้านค้า (CSY)",
        partyRefType: "system",
      },
    ];

    await Promise.all(parties.map((p) => prisma.contractParty.create({ data: p })));
  }

  // Generate installment schedule on contract creation
  let installments: object[] = [];
  if (input.generate_installments) {
    installments = await generateInstallmentSchedule(contract.id, {
      principal: resolvedPrincipal,
      annualRate: input.interest_rate,
      numInstallments: input.num_installments,
      startDate: new Date(input.start_date),
      saleId: installmentSale?.id || financeCompanySale?.id || undefined,
    });
  }

  const result = await prisma.contract.findUnique({
    where: { id: contract.id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
      contractSales: { include: { sale: true } },
      contractParties: true,
    },
  });

  return { data: { ...result, installments } };
}

/**
 * Generate installment schedule using Declining Balance (Reducing Balance) method.
 *
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * where r = annualRate / 12 / 100, n = numInstallments, P = principal
 *
 * Per period:
 *   interest_portion   = remaining_balance × r
 *   principal_portion  = EMI - interest_portion
 *   remaining_balance -= principal_portion
 *
 * Special case: 0% interest → equal principal split.
 */
async function generateInstallmentSchedule(
  contractId: string,
  options: {
    principal: number;
    annualRate: number;
    numInstallments: number;
    startDate: Date;
    saleId?: string;
  }
) {
  const { principal, annualRate, numInstallments, startDate } = options;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  let emiAmount: number;
  let schedule: Array<{ principal: number; interest: number; balance: number }>;

  if (annualRate === 0) {
    // Zero-interest: equal principal per period
    const basePrincipal = round2(principal / numInstallments);
    schedule = [];
    let remaining = principal;
    for (let i = 1; i <= numInstallments; i++) {
      const p = i === numInstallments ? round2(remaining) : basePrincipal;
      remaining = round2(remaining - p);
      schedule.push({ principal: p, interest: 0, balance: remaining });
    }
    emiAmount = basePrincipal;
  } else {
    const r = annualRate / 12 / 100;
    const factor = Math.pow(1 + r, numInstallments);
    emiAmount = round2((principal * r * factor) / (factor - 1));

    schedule = [];
    let remaining = principal;
    for (let i = 1; i <= numInstallments; i++) {
      const interest = round2(remaining * r);
      let principalPart = round2(emiAmount - interest);
      // Last installment: clear any rounding remainder
      if (i === numInstallments) {
        principalPart = round2(remaining);
      }
      remaining = round2(remaining - principalPart);
      const emi = i === numInstallments ? round2(principalPart + interest) : emiAmount;
      schedule.push({ principal: principalPart, interest, balance: remaining });
      emiAmount = emi; // store for last
    }
  }

  const installments = [];
  for (let i = 0; i < numInstallments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);

    const item = schedule[i]!;
    const amountDue = round2(item.principal + item.interest);

    const installment = await prisma.installment.create({
      data: {
        contractId,
        saleId: options.saleId || null,
        installmentNumber: i + 1,
        dueDate,
        amountDue,
        principalPortion: item.principal as unknown as Prisma.Decimal,
        interestPortion: item.interest as unknown as Prisma.Decimal,
        remainingBalance: item.balance as unknown as Prisma.Decimal,
        status: "pending",
      },
    });

    installments.push(installment);
  }

  return installments;
}

export async function listContracts(query: ListContractsQuery) {
  const { customer_id, sale_id, status, q, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (customer_id) {
    where.customerId = customer_id;
  }
  if (sale_id) {
    where.contractSales = { some: { saleId: sale_id } };
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
      installments: {
        orderBy: { installmentNumber: "asc" },
        include: {
          payments: {
            include: { taxInvoices: true },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        include: {
          verifiedBy: { select: { id: true, name: true } },
          taxInvoices: true,
        },
      },
      contractParties: { orderBy: { role: "asc" } },
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
    principal: Number(contract.totalPrincipal),
    annualRate: Number(contract.interestRate),
    numInstallments: contract.numInstallments,
    startDate: contract.startDate,
  });

  return { data: installments };
}

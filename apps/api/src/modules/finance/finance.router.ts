import { Router, type IRouter } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { sendInstallmentReminder } from "../notifications/notifications.service.js";

export const financeRouter: IRouter = Router();

// Require auth for all finance endpoints
financeRouter.use(requireAuth);

// GET /api/v1/finance/contracts
financeRouter.get("/contracts", async (req, res) => {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true, lineId: true, isLineLinked: true } },
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
        contractSales: {
          include: {
            sale: {
              include: { motorcycle: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedContracts = contracts.map((contract) => {
      const now = new Date();
      
      // Filter overdue installments
      const overdueInstallments = contract.installments.filter((inst) => {
        return (
          inst.status === "overdue" ||
          ((inst.status === "pending" || inst.status === "partially_paid") &&
            new Date(inst.dueDate) < now)
        );
      });

      const totalOverdueAmount = overdueInstallments.reduce(
        (sum, inst) => sum + (Number(inst.amountDue) - Number(inst.amountPaid)),
        0
      );

      // Find next pending installment
      const nextPending = contract.installments.find(
        (inst) => inst.status === "pending" || inst.status === "partially_paid"
      );

      // Total paid on the contract
      const totalPaid = contract.installments.reduce(
        (sum, inst) => sum + Number(inst.amountPaid),
        0
      );

      const totalOutstanding = Number(contract.totalAmount) - totalPaid;

      return {
        id: contract.id,
        contract_number: contract.contractNumber,
        customer: contract.customer,
        status: contract.status,
        total_amount: Number(contract.totalAmount),
        total_principal: Number(contract.totalPrincipal),
        total_interest: Number(contract.totalInterest),
        total_paid: totalPaid,
        total_outstanding: Math.max(0, totalOutstanding),
        installment_count: contract.numInstallments,
        installment_rate: contract.installments[0] ? Number(contract.installments[0].amountDue) : 0,
        overdue_count: overdueInstallments.length,
        total_overdue_amount: totalOverdueAmount,
        next_due_date: nextPending ? nextPending.dueDate : null,
        next_due_amount: nextPending ? Number(nextPending.amountDue) - Number(nextPending.amountPaid) : 0,
        motorcycle: contract.contractSales[0]?.sale?.motorcycle ?? null,
        installments: contract.installments,
      };
    });

    res.json({ data: enrichedContracts });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/finance/daily-summary
financeRouter.get("/daily-summary", async (req, res) => {
  const dateStr = req.query["date"] as string;
  const targetDate = dateStr ? new Date(dateStr) : new Date();

  // Create range for target date (start of day to end of day)
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // 1. Expected Collections (installments due today)
    const dueInstallments = await prisma.installment.findMany({
      where: {
        dueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        contract: { include: { customer: { select: { name: true } } } },
      },
    });

    const totalExpected = dueInstallments.reduce((sum, inst) => sum + Number(inst.amountDue), 0);

    // 2. Actual Collections (payments received today, verified or not)
    const paymentsReceived = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        contract: { include: { customer: { select: { name: true } } } },
        installment: { include: { contract: { include: { customer: { select: { name: true } } } } } },
      },
    });

    const totalCollected = paymentsReceived.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      data: {
        date: startOfDay.toISOString().slice(0, 10),
        total_expected: totalExpected,
        total_collected: totalCollected,
        remaining_outstanding: Math.max(0, totalExpected - totalCollected),
        expected_items: dueInstallments.map((i) => ({
          installment_id: i.id,
          installment_number: i.installmentNumber,
          contract_number: i.contract?.contractNumber ?? "-",
          customer_name: i.contract?.customer?.name ?? "Unknown",
          amount_due: Number(i.amountDue),
          amount_paid: Number(i.amountPaid),
          status: i.status,
        })),
        received_payments: paymentsReceived.map((p) => ({
          payment_id: p.id,
          contract_number: p.contract?.contractNumber ?? p.installment?.contract?.contractNumber ?? "-",
          customer_name: p.contract?.customer?.name ?? p.installment?.contract?.customer?.name ?? "Unknown",
          amount: Number(p.amount),
          channel: p.paymentChannel,
          verified: p.verified,
        })),
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/finance/monthly-summary
financeRouter.get("/monthly-summary", async (req, res) => {
  const monthStr = req.query["month"] as string; // YYYY-MM
  const now = new Date();
  const year = monthStr ? parseInt(monthStr.split("-")[0]!) : now.getFullYear();
  const month = monthStr ? parseInt(monthStr.split("-")[1]!) - 1 : now.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  try {
    // Expected installments this month
    const installments = await prisma.installment.findMany({
      where: {
        dueDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const totalExpected = installments.reduce((sum, inst) => sum + Number(inst.amountDue), 0);
    const totalPaid = installments.reduce((sum, inst) => sum + Number(inst.amountPaid), 0);
    const overdueCount = installments.filter((i) => i.status === "overdue" || (i.status === "pending" && new Date(i.dueDate) < now)).length;

    res.json({
      data: {
        month: `${year}-${String(month + 1).padStart(2, "0")}`,
        total_expected: totalExpected,
        total_paid: totalPaid,
        total_outstanding: Math.max(0, totalExpected - totalPaid),
        overdue_installments_count: overdueCount,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/finance/reminders/:installmentId
financeRouter.post("/reminders/:installmentId", async (req, res) => {
  const channel = req.body["channel"] as "line" | "sms" | "email" | undefined;
  
  try {
    const result = await sendInstallmentReminder(req.params["installmentId"] as string, channel);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

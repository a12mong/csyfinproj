import { Router, type IRouter } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { sendInstallmentReminder } from "../notifications/notifications.service.js";
import {
  createNotificationBatch,
  processNotificationBatch,
  listNotificationBatches,
} from "./notification-batches.service.js";

export const financeRouter: IRouter = Router();

// Require auth for all finance endpoints
financeRouter.use(requireAuth);

// GET /api/v1/finance/overview
// Lightweight aggregates for the KPI strip — avoids loading every contract
// with all installments just to show headline numbers.
financeRouter.get("/overview", requirePermission("finance", "view"), async (_req, res) => {
  try {
    const now = new Date();
    const [contractAgg, paidAgg, overdueInstallments] = await Promise.all([
      prisma.contract.aggregate({ _count: true, _sum: { totalAmount: true } }),
      prisma.installment.aggregate({
        _sum: { amountPaid: true },
        where: { contractId: { not: null } },
      }),
      prisma.installment.findMany({
        where: {
          OR: [
            { status: "overdue" },
            { status: { in: ["pending", "partially_paid"] }, dueDate: { lt: now } },
          ],
        },
        select: { contractId: true, amountDue: true, amountPaid: true },
      }),
    ]);

    const totalAmount = Number(contractAgg._sum.totalAmount ?? 0);
    const totalPaid = Number(paidAgg._sum.amountPaid ?? 0);
    const totalOverdueAmount = overdueInstallments.reduce(
      (sum, inst) => sum + Number(inst.amountDue) - Number(inst.amountPaid),
      0
    );
    const overdueContractIds = new Set(
      overdueInstallments.filter((i) => i.contractId).map((i) => i.contractId)
    );

    res.json({
      data: {
        contracts_count: contractAgg._count,
        total_outstanding: Math.max(0, totalAmount - totalPaid),
        total_overdue_amount: totalOverdueAmount,
        overdue_contracts_count: overdueContractIds.size,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/finance/contracts
financeRouter.get("/contracts", requirePermission("finance", "view"), async (req, res) => {
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
financeRouter.get("/daily-summary", requirePermission("finance", "view"), async (req, res) => {
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
financeRouter.get("/monthly-summary", requirePermission("finance", "view"), async (req, res) => {
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

// GET /api/v1/finance/upcoming-due?days=7
// Installments due today or within the next N days (plus anything already past
// due and unpaid), with customer/contract context for the collections screen.
financeRouter.get("/upcoming-due", requirePermission("finance", "view"), async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query["days"] as string) || 7, 1), 60);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const horizon = new Date(startOfToday);
  horizon.setDate(horizon.getDate() + days);
  horizon.setHours(23, 59, 59, 999);

  try {
    const installments = await prisma.installment.findMany({
      where: {
        dueDate: { lte: horizon },
        status: { in: ["pending", "partially_paid", "overdue"] },
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            customer: {
              select: { id: true, name: true, phone: true, lineId: true, isLineLinked: true },
            },
          },
        },
        sale: {
          select: {
            id: true,
            customer: {
              select: { id: true, name: true, phone: true, lineId: true, isLineLinked: true },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const items = installments.map((inst) => {
      const due = new Date(inst.dueDate);
      const bucket = due < startOfToday ? "overdue" : due <= endOfToday ? "today" : "upcoming";
      const customer = inst.contract?.customer ?? inst.sale?.customer ?? null;
      return {
        installment_id: inst.id,
        installment_number: inst.installmentNumber,
        due_date: inst.dueDate,
        remaining: Number(inst.amountDue) - Number(inst.amountPaid),
        status: inst.status,
        bucket,
        contract_id: inst.contract?.id ?? null,
        contract_number: inst.contract?.contractNumber ?? null,
        customer,
      };
    });

    const sum = (bucket: string) =>
      items.filter((i) => i.bucket === bucket).reduce((s, i) => s + i.remaining, 0);

    res.json({
      data: {
        days,
        items,
        summary: {
          overdue_count: items.filter((i) => i.bucket === "overdue").length,
          overdue_amount: sum("overdue"),
          today_count: items.filter((i) => i.bucket === "today").length,
          today_amount: sum("today"),
          upcoming_count: items.filter((i) => i.bucket === "upcoming").length,
          upcoming_amount: sum("upcoming"),
          // Carried balance: partially paid AND already due (today or past) — needs follow-up.
          // Advance payment: partially paid but the due date is still ahead — normal.
          partial_count: items.filter(
            (i) => i.status === "partially_paid" && i.bucket !== "upcoming"
          ).length,
          partial_amount: items
            .filter((i) => i.status === "partially_paid" && i.bucket !== "upcoming")
            .reduce((s, i) => s + i.remaining, 0),
          advance_count: items.filter(
            (i) => i.status === "partially_paid" && i.bucket === "upcoming"
          ).length,
          advance_amount: items
            .filter((i) => i.status === "partially_paid" && i.bucket === "upcoming")
            .reduce((s, i) => s + i.remaining, 0),
        },
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/finance/reminders/bulk
// Body: { installment_ids: string[], channel?: "line" | "sms" | "email" }
// Creates an auditable NotificationBatch first, then processes it.
financeRouter.post("/reminders/bulk", requirePermission("finance", "send_reminder"), async (req, res) => {
  const installmentIds = req.body["installment_ids"];
  const channel = req.body["channel"] as "line" | "sms" | "email" | undefined;

  if (!Array.isArray(installmentIds) || installmentIds.length === 0) {
    res.status(400).json({ error: "installment_ids must be a non-empty array" });
    return;
  }
  if (installmentIds.length > 200) {
    res.status(400).json({ error: "Maximum 200 installments per bulk send" });
    return;
  }

  try {
    const batch = await createNotificationBatch({
      installmentIds: installmentIds.map(String),
      channel,
      source: "manual",
      createdByUserId: req.user?.sub,
    });
    const processed = await processNotificationBatch(batch.id);
    res.json({
      data: {
        batch_id: processed.id,
        sent: processed.sentCount,
        failed: processed.failedCount,
        status: processed.status,
        items: processed.items,
      },
    });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

// GET /api/v1/finance/notification-batches?page=
financeRouter.get("/notification-batches", requirePermission("finance", "view"), async (req, res) => {
  const page = Math.max(parseInt(req.query["page"] as string) || 1, 1);
  try {
    const result = await listNotificationBatches(page, 10);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});

// POST /api/v1/finance/reminders/:installmentId
financeRouter.post("/reminders/:installmentId", requirePermission("finance", "send_reminder"), async (req, res) => {
  const channel = req.body["channel"] as "line" | "sms" | "email" | undefined;
  
  try {
    const result = await sendInstallmentReminder(req.params["installmentId"] as string, channel);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    res.status(e.statusCode ?? 500).json({ error: e.message ?? "Internal server error" });
  }
});

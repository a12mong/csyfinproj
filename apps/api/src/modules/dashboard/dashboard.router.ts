import { Router, type IRouter } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";

export const dashboardRouter: IRouter = Router();

dashboardRouter.use(requireAuth);

// The summary aggregates the whole database; it changes slowly and is hit by
// every user on login, so serve it from a short-lived in-memory cache.
const CACHE_TTL_MS = 60_000;
let cache: { data: Awaited<ReturnType<typeof buildSummary>>; expiresAt: number } | null = null;

async function buildSummary() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    motoByStatus,
    customersCount,
    activeSalesCount,
    activeContractsCount,
    overdueInstallments,
    dueTodayInstallments,
    todayPayments,
    monthPayments,
    monthInstallmentAgg,
    recentPayments,
    upcomingInstallments,
  ] = await Promise.all([
    prisma.motorcycle.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.customer.count(),
    prisma.sale.count({ where: { status: "active" } }),
    prisma.contract.count({ where: { status: "active" } }),
    prisma.installment.findMany({
      where: {
        OR: [
          { status: "overdue" },
          { status: { in: ["pending", "partially_paid"] }, dueDate: { lt: startOfToday } },
        ],
      },
      select: { amountDue: true, amountPaid: true },
    }),
    prisma.installment.findMany({
      where: {
        dueDate: { gte: startOfToday, lte: endOfToday },
        status: { in: ["pending", "partially_paid", "overdue"] },
      },
      select: { amountDue: true, amountPaid: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { paymentDate: { gte: startOfToday, lte: endOfToday } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paymentDate: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.installment.aggregate({
      _sum: { amountDue: true, amountPaid: true },
      where: { dueDate: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        contract: { select: { contractNumber: true, customer: { select: { name: true } } } },
        sale: { select: { customer: { select: { name: true } } } },
        installment: {
          select: {
            installmentNumber: true,
            contract: { select: { contractNumber: true, customer: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.installment.findMany({
      take: 5,
      orderBy: { dueDate: "asc" },
      where: {
        dueDate: { gte: startOfToday },
        status: { in: ["pending", "partially_paid"] },
      },
      include: {
        contract: {
          select: { id: true, contractNumber: true, customer: { select: { name: true } } },
        },
        sale: { select: { customer: { select: { name: true } } } },
      },
    }),
  ]);

  const remainingOf = (rows: Array<{ amountDue: unknown; amountPaid: unknown }>) =>
    rows.reduce((sum, i) => sum + Number(i.amountDue) - Number(i.amountPaid), 0);
  const motoCount = (status: string) =>
    motoByStatus.find((m) => m.status === status)?._count._all ?? 0;

  return {
    generated_at: now.toISOString(),
    inventory: {
      total: motoByStatus.reduce((sum, m) => sum + m._count._all, 0),
      in_stock: motoCount("in_stock"),
      reserved: motoCount("reserved"),
      sold: motoCount("sold"),
    },
    customers: { total: customersCount },
    finance: {
      active_sales: activeSalesCount,
      active_contracts: activeContractsCount,
      overdue_count: overdueInstallments.length,
      overdue_amount: remainingOf(overdueInstallments),
      due_today_count: dueTodayInstallments.length,
      due_today_amount: remainingOf(dueTodayInstallments),
      collected_today: Number(todayPayments._sum.amount ?? 0),
      payments_today_count: todayPayments._count,
      collected_month: Number(monthPayments._sum.amount ?? 0),
      expected_month: Number(monthInstallmentAgg._sum.amountDue ?? 0),
    },
    recent_payments: recentPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      channel: p.paymentChannel,
      verified: p.verified,
      payment_date: p.paymentDate,
      created_at: p.createdAt,
      customer_name:
        p.contract?.customer?.name ??
        p.installment?.contract?.customer?.name ??
        p.sale?.customer?.name ??
        null,
      contract_number:
        p.contract?.contractNumber ?? p.installment?.contract?.contractNumber ?? null,
    })),
    upcoming_installments: upcomingInstallments.map((i) => ({
      id: i.id,
      installment_number: i.installmentNumber,
      due_date: i.dueDate,
      remaining: Number(i.amountDue) - Number(i.amountPaid),
      customer_name: i.contract?.customer?.name ?? i.sale?.customer?.name ?? null,
      contract_id: i.contract?.id ?? null,
      contract_number: i.contract?.contractNumber ?? null,
    })),
  };
}

// GET /api/v1/dashboard/summary?refresh=1
dashboardRouter.get("/summary", requirePermission("dashboard", "view"), async (req, res) => {
  const forceRefresh = req.query["refresh"] === "1";
  try {
    if (!forceRefresh && cache && cache.expiresAt > Date.now()) {
      res.json({ data: cache.data, cached: true });
      return;
    }
    const data = await buildSummary();
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    res.json({ data, cached: false });
  } catch (err: unknown) {
    const e = err as { message?: string };
    res.status(500).json({ error: e.message ?? "Internal server error" });
  }
});

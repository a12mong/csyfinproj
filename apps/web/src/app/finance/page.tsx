"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { Installment, PaginatedResponse } from "@csyfinproj/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  overdue: "bg-red-50 text-red-700",
  partially_paid: "bg-orange-50 text-orange-700",
  paid: "bg-green-50 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  overdue: "Overdue",
  partially_paid: "Partially Paid",
  paid: "Paid",
};

const PAGE_SIZE = 20;

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(installment: Installment) {
  return (
    installment.status === "overdue" ||
    (installment.status === "pending" &&
      new Date(installment.dueDate) < new Date())
  );
}

interface InstallmentWithSale extends Installment {
  sale?: {
    customerId: string;
    customer?: { name: string; phone: string };
  };
}

interface SummaryStats {
  total: number;
  overdue: number;
  pending: number;
  paid: number;
  partiallyPaid: number;
  totalOverdueAmount: number;
}

export default function FinancePage() {
  const [installments, setInstallments] = useState<InstallmentWithSale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  const fetchInstallments = useCallback(
    async (currentPage: number, status: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(currentPage) });
        if (status) params.set("status", status);

        const res = await apiFetch<PaginatedResponse<InstallmentWithSale>>(
          `/installments?${params}`
        );
        setInstallments(res.data);
        setTotal(res.total);

        // Build summary stats from first-page data when no filter
        if (!status && currentPage === 1) {
          const allRes = await apiFetch<PaginatedResponse<InstallmentWithSale>>(
            `/installments?page=1`
          );
          const data = allRes.data;
          const overdue = data.filter(
            (i) => i.status === "overdue" || isOverdue(i)
          );
          setStats({
            total: allRes.total,
            overdue: overdue.length,
            pending: data.filter((i) => i.status === "pending").length,
            paid: data.filter((i) => i.status === "paid").length,
            partiallyPaid: data.filter((i) => i.status === "partially_paid")
              .length,
            totalOverdueAmount: overdue.reduce(
              (sum, i) => sum + (i.amountDue - i.amountPaid),
              0
            ),
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load installments"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchInstallments(page, statusFilter);
  }, [page, statusFilter, fetchInstallments]);

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleSendReminders() {
    setNotifying(true);
    setNotifyResult(null);
    try {
      const res = await apiFetch<{ sent: number; failed: number }>(
        "/notifications/send-reminders",
        { method: "POST", body: JSON.stringify({ channel: "line" }) }
      );
      setNotifyResult(`Sent ${res.sent} reminder(s). Failed: ${res.failed}.`);
    } catch (err) {
      setNotifyResult(
        err instanceof Error ? `Error: ${err.message}` : "Failed to send reminders"
      );
    } finally {
      setNotifying(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
            <p className="text-sm text-gray-500 mt-1">
              Installment overview &amp; debt management
            </p>
          </div>
          <button
            onClick={handleSendReminders}
            disabled={notifying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {notifying ? "Sending…" : "Send Overdue Reminders"}
          </button>
        </div>

        {notifyResult && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {notifyResult}
          </div>
        )}

        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xs text-gray-500 mb-1">Total Installments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 px-5 py-4">
              <p className="text-xs text-red-500 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-xs text-red-400 mt-0.5">
                {formatPrice(stats.totalOverdueAmount)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-yellow-200 px-5 py-4">
              <p className="text-xs text-yellow-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">
                {stats.pending}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-green-200 px-5 py-4">
              <p className="text-xs text-green-600 mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-700">{stats.paid}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    #
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Due Date
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">
                    Amount Due
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">
                    Amount Paid
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">
                    Balance
                  </th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : installments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-gray-400"
                    >
                      No installments found.
                    </td>
                  </tr>
                ) : (
                  installments.map((inst) => {
                    const overdue = isOverdue(inst);
                    const balance = inst.amountDue - inst.amountPaid;
                    return (
                      <tr
                        key={inst.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          overdue ? "bg-red-50/40" : ""
                        }`}
                      >
                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                          {inst.installmentNumber}
                        </td>
                        <td
                          className={`px-5 py-3 ${
                            overdue
                              ? "text-red-600 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {formatDate(inst.dueDate)}
                          {overdue && (
                            <span className="ml-1.5 text-xs text-red-500">
                              &#9888;
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {formatPrice(inst.amountDue)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">
                          {formatPrice(inst.amountPaid)}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-medium ${
                            balance > 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {formatPrice(balance)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_STYLES[inst.status] ??
                              "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {STATUS_LABELS[inst.status] ?? inst.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {inst.sale?.customerId && (
                            <Link
                              href={`/finance/${inst.sale.customerId}`}
                              className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                            >
                              Customer
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages} &mdash; {total} installment
                {total !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";

function formatPrice(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  lineId?: string | null;
  isLineLinked: boolean;
}

interface ContractSummary {
  id: string;
  contract_number: string;
  customer: CustomerSummary;
  status: string;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  installment_count: number;
  installment_rate: number;
  overdue_count: number;
  total_overdue_amount: number;
  next_due_date: string | null;
  next_due_amount: number;
  motorcycle: {
    brand: string;
    model: string;
    chassisNumber: string;
    color: string;
  } | null;
  installments: Array<{
    id: string;
    installmentNumber: number;
    status: string;
    amountDue: number;
    amountPaid: number;
    dueDate: string;
  }>;
}

interface DailySummary {
  date: string;
  total_expected: number;
  total_collected: number;
  remaining_outstanding: number;
}

interface MonthlySummary {
  month: string;
  total_expected: number;
  total_paid: number;
  total_outstanding: number;
  overdue_installments_count: number;
}

export default function FinanceDashboard() {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reminderLoadingId, setReminderLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contractsRes, dailyRes, monthlyRes] = await Promise.all([
        apiFetch<{ data: ContractSummary[] }>("/finance/contracts"),
        apiFetch<{ data: DailySummary }>("/finance/daily-summary"),
        apiFetch<{ data: MonthlySummary }>("/finance/monthly-summary"),
      ]);
      setContracts(contractsRes.data);
      setDailySummary(dailyRes.data);
      setMonthlySummary(monthlyRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setLoading(true); // wait, let's keep loading false
    }
  }, []);

  // Set loading false
  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const triggerReminder = async (installmentId: string, channel: "line" | "sms" | "email") => {
    setReminderLoadingId(installmentId + "-" + channel);
    try {
      await apiFetch(`/finance/reminders/${installmentId}`, {
        method: "POST",
        body: JSON.stringify({ channel }),
      });
      toastSuccess(`Reminder sent via ${channel.toUpperCase()} successfully.`);
    } catch (err) {
      alertError(err instanceof Error ? err.message : `Failed to send reminder via ${channel}`);
    } finally {
      setReminderLoadingId(null);
    }
  };

  const totalOutstandingAll = contracts.reduce((sum, c) => sum + c.total_outstanding, 0);
  const totalOverdueAll = contracts.reduce((sum, c) => sum + c.total_overdue_amount, 0);
  const overdueContractsCount = contracts.filter((c) => c.overdue_count > 0).length;

  return (
    <DashboardLayout>
      <div className="px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance & Collections Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time monitoring of lease contracts, repayments, and overdue alerts.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              loadData().finally(() => setLoading(false));
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Collections Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Total Outstanding Debt</p>
            <p className="text-2xl font-bold text-blue-900">{formatPrice(totalOutstandingAll)}</p>
            <p className="text-xs text-blue-500 mt-1">Across {contracts.length} active lease contracts</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Total Overdue Amount</p>
            <p className="text-2xl font-bold text-red-900">{formatPrice(totalOverdueAll)}</p>
            <p className="text-xs text-red-500 mt-1">
              {overdueContractsCount} contract{overdueContractsCount !== 1 ? "s" : ""} currently overdue
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Today's Collections</p>
            <p className="text-2xl font-bold text-green-950">
              {dailySummary ? formatPrice(dailySummary.total_collected) : "—"}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Expected: {dailySummary ? formatPrice(dailySummary.total_expected) : "—"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-100 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">This Month's Collections</p>
            <p className="text-2xl font-bold text-purple-950">
              {monthlySummary ? formatPrice(monthlySummary.total_paid) : "—"}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Expected: {monthlySummary ? formatPrice(monthlySummary.total_expected) : "—"}
            </p>
          </div>
        </div>

        {/* Contract-centric Overview Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Contract Collections Ledger</h3>
            <span className="text-xs text-gray-500">Showing {contracts.length} active leases</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Contract / Customer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Vehicle Info</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Repayment rate</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Debt Overview</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">Overdue Stats</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Next Payment</th>
                  <th className="px-5 py-3 text-center">Reminders & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : contracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                      No contracts currently found.
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => {
                    const oldestUnpaid = c.installments.find((inst) => inst.status !== "paid");
                    const pctPaid = Math.round((c.total_paid / c.total_amount) * 100);

                    return (
                      <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${c.overdue_count > 0 ? "bg-red-50/10" : ""}`}>
                        {/* Contract / Customer */}
                        <td className="px-5 py-4">
                          <div>
                            <Link href={`/contracts/${c.id}`} className="font-semibold text-primary-600 hover:text-primary-700 font-mono text-sm">
                              {c.contract_number}
                            </Link>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{c.customer.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-gray-500">{c.customer.phone}</span>
                              {c.customer.isLineLinked ? (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                  LINE Linked
                                </span>
                              ) : (
                                <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] bg-gray-50 text-gray-400 border border-gray-200">
                                  No LINE
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Vehicle Info */}
                        <td className="px-5 py-4 text-xs text-gray-600">
                          {c.motorcycle ? (
                            <div>
                              <p className="font-semibold text-gray-800">
                                {c.motorcycle.brand} {c.motorcycle.model}
                              </p>
                              <p className="font-mono text-gray-500 mt-0.5">{c.motorcycle.chassisNumber}</p>
                              <p className="text-gray-400">{c.motorcycle.color}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Repayment rate */}
                        <td className="px-5 py-4 text-right">
                          <p className="font-semibold text-gray-900">{formatPrice(c.installment_rate)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">/ month</p>
                          <p className="text-xs text-gray-400 mt-0.5">{c.installment_count} periods</p>
                        </td>

                        {/* Debt Overview */}
                        <td className="px-5 py-4 text-right">
                          <div className="inline-block text-right">
                            <p className="font-semibold text-gray-900">{formatPrice(c.total_outstanding)}</p>
                            <p className="text-xs text-gray-500 mt-0.5">outstanding</p>
                            <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                              <div
                                className="bg-primary-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${pctPaid}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 block">{pctPaid}% Paid ({formatPrice(c.total_paid)})</span>
                          </div>
                        </td>

                        {/* Overdue Stats */}
                        <td className="px-5 py-4 text-center">
                          {c.overdue_count > 0 ? (
                            <div>
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
                                {c.overdue_count} Overdue
                              </span>
                              <p className="text-xs text-red-600 font-bold mt-1">
                                {formatPrice(c.total_overdue_amount)}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              Good Standing
                            </span>
                          )}
                        </td>

                        {/* Next Payment */}
                        <td className="px-5 py-4 text-xs">
                          {c.next_due_date ? (
                            <div>
                              <p className="font-semibold text-gray-900">{formatDate(c.next_due_date)}</p>
                              <p className="text-gray-500 mt-0.5">{formatPrice(c.next_due_amount)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">Paid off</span>
                          )}
                        </td>

                        {/* Reminders & Actions */}
                        <td className="px-5 py-4 text-center">
                          {oldestUnpaid ? (
                            <div className="inline-flex flex-col gap-1.5 max-w-[120px] mx-auto">
                              <button
                                onClick={() => triggerReminder(oldestUnpaid.id, "line")}
                                disabled={!c.customer.isLineLinked || reminderLoadingId !== null}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md border text-center transition-colors ${
                                  c.customer.isLineLinked
                                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                    : "bg-gray-50 border-gray-150 text-gray-400 cursor-not-allowed"
                                }`}
                              >
                                {reminderLoadingId === `${oldestUnpaid.id}-line` ? "Sending..." : "Send LINE"}
                              </button>
                              <button
                                onClick={() => triggerReminder(oldestUnpaid.id, "sms")}
                                disabled={reminderLoadingId !== null}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-center transition-colors"
                              >
                                {reminderLoadingId === `${oldestUnpaid.id}-sms` ? "Sending..." : "Send SMS"}
                              </button>
                              <button
                                onClick={() => triggerReminder(oldestUnpaid.id, "email")}
                                disabled={reminderLoadingId !== null}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-center transition-colors"
                              >
                                {reminderLoadingId === `${oldestUnpaid.id}-email` ? "Sending..." : "Send Email"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

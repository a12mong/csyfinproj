"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { installmentStatusLabel, isAdvancePartial } from "@/lib/format";
import type {
  Customer,
  SaleWithInstallments,
  Installment,
} from "@csyfinproj/shared";

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

function isOverdue(inst: Installment) {
  return (
    inst.status === "overdue" ||
    (inst.status === "pending" && new Date(inst.dueDate) < new Date())
  );
}

export default function CustomerFinancePage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleWithInstallments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [customerRes, salesRes] = await Promise.all([
          apiFetch<{ data: Customer }>(`/customers/${customerId}`),
          apiFetch<{ data: SaleWithInstallments[] }>(
            `/sales?customer_id=${customerId}&include_installments=true`
          ),
        ]);
        setCustomer(customerRes.data);
        setSales(salesRes.data ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load customer data"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customerId]);

  // Aggregate all installments across all sales sorted by due date
  const allInstallments = sales
    .flatMap((sale) =>
      (sale.installments ?? []).map((inst) => ({ ...inst, sale }))
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

  const totalDebt = allInstallments.reduce(
    (sum, i) => sum + (i.amountDue - i.amountPaid),
    0
  );
  const overdueCount = allInstallments.filter(isOverdue).length;
  const paidCount = allInstallments.filter((i) => i.status === "paid").length;

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/finance"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            &larr; Back to Finance
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <>
            {/* Customer Header */}
            {customer && (
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {customer.name}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {customer.phone}
                      {customer.email && (
                        <span className="ml-2">&middot; {customer.email}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      ID: {customer.idCardNumber}
                    </p>
                  </div>
                  <Link
                    href={`/customers/${customerId}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Customer Profile
                  </Link>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Total Balance</p>
                    <p
                      className={`text-xl font-bold mt-0.5 ${
                        totalDebt > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatPrice(totalDebt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Overdue</p>
                    <p className="text-xl font-bold text-red-600 mt-0.5">
                      {overdueCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="text-xl font-bold text-green-600 mt-0.5">
                      {paidCount} / {allInstallments.length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Installment Schedule */}
            {sales.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center text-sm text-gray-400">
                No installment sales found for this customer.
              </div>
            ) : (
              <div className="space-y-6">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    {/* Sale header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {sale.motorcycle
                            ? `${sale.motorcycle.brand} ${sale.motorcycle.model} (${sale.motorcycle.year})`
                            : "Motorcycle"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Sale date: {formatDate(sale.saleDate)} &middot;{" "}
                          {sale.numInstallments} installments &middot;{" "}
                          {formatPrice(sale.totalPrice)}
                        </p>
                      </div>
                      <Link
                        href={`/sales/${sale.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View Sale
                      </Link>
                    </div>

                    {/* Installments table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
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
                              Paid
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
                          {(sale.installments ?? [])
                            .sort((a, b) => a.installmentNumber - b.installmentNumber)
                            .map((inst) => {
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
                                      <span className="ml-1 text-xs text-red-400">
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
                                      balance > 0
                                        ? "text-red-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {formatPrice(balance)}
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        isAdvancePartial(inst.status, inst.dueDate)
                                          ? "bg-sky-50 text-sky-700"
                                          : STATUS_STYLES[inst.status] ??
                                            "bg-gray-100 text-gray-500"
                                      }`}
                                    >
                                      {installmentStatusLabel(inst.status, inst.dueDate)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <Link
                                      href={`/payments?installmentId=${inst.id}`}
                                      className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                                    >
                                      Pay
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

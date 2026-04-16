"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { SaleWithInstallments, Installment } from "@csyfinproj/shared";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── installment status badge ─────────────────────────────────────────────────

const INSTALLMENT_STATUS_STYLES: Record<Installment["status"], string> = {
  pending: "bg-yellow-50 text-yellow-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
  partially_paid: "bg-orange-50 text-orange-700",
};

const INSTALLMENT_STATUS_LABELS: Record<Installment["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  partially_paid: "Partial",
};

function InstallmentBadge({ status }: { status: Installment["status"] }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        INSTALLMENT_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {INSTALLMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── sale status badge ────────────────────────────────────────────────────────

const SALE_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  defaulted: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  installment: "Installment",
  finance_company: "Finance Company",
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const [sale, setSale] = useState<SaleWithInstallments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSale() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ data: SaleWithInstallments }>(
          `/sales/${params.id}`
        );
        setSale(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sale");
      } finally {
        setLoading(false);
      }
    }
    fetchSale();
  }, [params.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !sale) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "Sale not found."}
          </div>
          <Link
            href="/sales"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            ← Back to sales
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isInstallment = sale.paymentMethod === "installment";
  const isFinanceCompany = sale.paymentMethod === "finance_company";
  const isCash = sale.paymentMethod === "cash";

  const paidCount = sale.installments.filter((i) => i.status === "paid").length;
  const overdueCount = sale.installments.filter(
    (i) => i.status === "overdue"
  ).length;
  const totalPaid = sale.installments.reduce(
    (sum, i) => sum + i.amountPaid,
    0
  );
  const remaining = sale.financeAmount - totalPaid;

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/sales" className="hover:text-gray-700">
            Sales
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {formatDate(sale.saleDate)}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sale.motorcycle.brand} {sale.motorcycle.model}{" "}
              {sale.motorcycle.year}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-500">
                {formatDate(sale.saleDate)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  SALE_STATUS_STYLES[sale.status] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {sale.status}
              </span>
            </div>
          </div>
        </div>

        {/* Cash completed notice */}
        {isCash && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-600">✓</span>
            <p className="text-sm text-green-700">
              This cash sale was completed immediately upon creation.
            </p>
          </div>
        )}

        {/* Finance company notice */}
        {isFinanceCompany && (
          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-700">
              This sale is financed via{" "}
              <strong>{sale.financeCompanyName ?? "a financial institution"}</strong>.
              Installment terms are managed through the linked contract.
            </p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Price</p>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(sale.totalPrice)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Down Payment</p>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(sale.downPayment)}
            </p>
          </div>
          {!isCash && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Finance Amount</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatPrice(sale.financeAmount)}
                </p>
              </div>
              {isInstallment && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Remaining</p>
                  <p
                    className={`text-lg font-bold ${
                      remaining > 0 ? "text-gray-900" : "text-green-600"
                    }`}
                  >
                    {formatPrice(Math.max(0, remaining))}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info sections */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Customer
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {sale.customer.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">{sale.customer.phone}</p>
            {sale.customer.email && (
              <p className="text-sm text-gray-500">{sale.customer.email}</p>
            )}
            <Link
              href={`/customers/${sale.customer.id}`}
              className="mt-2 inline-block text-xs text-primary-600 hover:underline"
            >
              View profile →
            </Link>
          </div>

          {/* Motorcycle */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Motorcycle
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {sale.motorcycle.brand} {sale.motorcycle.model}{" "}
              {sale.motorcycle.year}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {sale.motorcycle.color}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {sale.motorcycle.chassisNumber}
            </p>
          </div>
        </div>

        {/* Sale details */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
          {[
            {
              label: "Payment Method",
              value: (
                <span className="capitalize">
                  {PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                </span>
              ),
            },
            ...(isFinanceCompany && sale.financeCompanyName
              ? [{ label: "Financial Institution", value: sale.financeCompanyName }]
              : []),
            ...(isFinanceCompany && sale.financeReferenceNumber
              ? [{ label: "Finance Reference #", value: sale.financeReferenceNumber }]
              : []),
            ...(!isCash
              ? [{ label: "Finance Amount", value: formatPrice(sale.financeAmount) }]
              : []),
            ...(isInstallment
              ? [
                  { label: "Installments", value: `${sale.numInstallments} months` },
                  { label: "Interest Rate", value: `${sale.interestRate}% / year` },
                  {
                    label: "Progress",
                    value: (
                      <span>
                        {paidCount} / {sale.installments.length} paid
                        {overdueCount > 0 && (
                          <span className="ml-2 text-red-600">
                            ({overdueCount} overdue)
                          </span>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),
            ...(sale.addons.length > 0
              ? [
                  {
                    label: "Add-ons",
                    value: sale.addons.map((a) => a.name).join(", "),
                  },
                ]
              : []),
            ...(sale.notes ? [{ label: "Notes", value: sale.notes }] : []),
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between px-6 py-4"
            >
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Installment schedule — only for installment payment method */}
        {isInstallment && sale.installments.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Installment Schedule
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-center px-5 py-3 font-medium text-gray-500 w-12">
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
                      <th className="text-left px-5 py-3 font-medium text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.installments.map((installment) => (
                      <tr
                        key={installment.id}
                        className={`border-b border-gray-50 ${
                          installment.status === "overdue"
                            ? "bg-red-50/30"
                            : installment.status === "paid"
                            ? "bg-green-50/20"
                            : ""
                        }`}
                      >
                        <td className="px-5 py-3 text-center text-gray-500">
                          {installment.installmentNumber}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {formatDate(installment.dueDate)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900">
                          {formatPrice(installment.amountDue)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">
                          {installment.amountPaid > 0
                            ? formatPrice(installment.amountPaid)
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <InstallmentBadge status={installment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Finance company — refer to contract */}
        {isFinanceCompany && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">Installment Schedule</p>
            <p className="text-sm text-gray-500">
              Installment terms for this finance-company sale are managed through a linked contract.
              View the contract to see the full amortization schedule.
            </p>
            <Link
              href="/contracts"
              className="mt-2 inline-block text-sm text-primary-600 hover:underline"
            >
              Go to Contracts →
            </Link>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/sales"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to sales
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

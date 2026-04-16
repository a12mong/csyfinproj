"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { CustomerWithDebtSummary, Sale, PaginatedResponse } from "@csyfinproj/shared";

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

const SALE_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  defaulted: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const SALE_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  defaulted: "Defaulted",
  cancelled: "Cancelled",
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerWithDebtSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [customerRes, salesRes] = await Promise.all([
          apiFetch<{ data: CustomerWithDebtSummary }>(`/customers/${params.id}`),
          apiFetch<PaginatedResponse<Sale>>(`/sales?customer_id=${params.id}&limit=50`),
        ]);
        setCustomer(customerRes.data);
        setSales(salesRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customer");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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

  if (error || !customer) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "Customer not found."}
          </div>
          <Link
            href="/customers"
            className="mt-4 inline-block text-sm text-primary-600 hover:underline"
          >
            ← Back to customers
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/customers" className="hover:text-gray-700">
            Customers
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{customer.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{customer.phone}</p>
          </div>
          <Link
            href={`/sales/new?customer_id=${customer.id}`}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            + New Sale
          </Link>
        </div>

        {/* Debt Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Debt</p>
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(customer.totalDebt)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Paid Amount</p>
            <p className="text-xl font-bold text-green-600">
              {formatPrice(customer.paidAmount)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Overdue</p>
            <p className={`text-xl font-bold ${customer.overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {customer.overdueCount} payment{customer.overdueCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6">
          {[
            { label: "Full Name", value: customer.name },
            { label: "Phone", value: customer.phone },
            { label: "ID Card Number", value: <span className="font-mono text-xs">{customer.idCardNumber}</span> },
            { label: "Email", value: customer.email ?? "—" },
            { label: "LINE ID", value: customer.lineId ?? "—" },
            { label: "Address", value: customer.address ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Sales History */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Sales History
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({sales.length})
            </span>
          </h2>

          {sales.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-10 text-center text-sm text-gray-400">
              No sales yet.{" "}
              <Link
                href={`/sales/new?customer_id=${customer.id}`}
                className="text-primary-600 hover:underline"
              >
                Create one?
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Date
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Method
                    </th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">
                      Total
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-600">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">
                        {sale.paymentMethod}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatPrice(sale.totalPrice)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            SALE_STATUS_STYLES[sale.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {SALE_STATUS_LABELS[sale.status] ?? sale.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/customers"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to customers
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

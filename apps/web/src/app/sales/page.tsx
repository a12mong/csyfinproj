"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { Sale, PaginatedResponse } from "@csyfinproj/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "defaulted", label: "Defaulted" },
  { value: "cancelled", label: "Cancelled" },
];

const SALE_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  defaulted: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
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

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(
    async (currentPage: number, status: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(currentPage) });
        if (status) params.set("status", status);

        const res = await apiFetch<PaginatedResponse<Sale>>(`/sales?${params}`);
        setSales(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sales");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchSales(page, statusFilter);
  }, [page, statusFilter, fetchSales]);

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} sale{total !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <span>+</span> New Sale
          </Link>
        </div>

        {/* Filter */}
        <div className="mb-6">
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
                    Sale Date
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Method
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">
                    Total Price
                  </th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">
                    Down Payment
                  </th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">
                    Installments
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
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
                ) : sales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-gray-400"
                    >
                      No sales found.{" "}
                      <Link
                        href="/sales/new"
                        className="text-primary-600 hover:underline"
                      >
                        Create one?
                      </Link>
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
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
                      <td className="px-5 py-3 text-right text-gray-600">
                        {formatPrice(sale.downPayment)}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">
                        {sale.paymentMethod === "installment"
                          ? sale.numInstallments
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            SALE_STATUS_STYLES[sale.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {sale.status}
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
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

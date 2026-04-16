"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type { Customer, PaginatedResponse } from "@csyfinproj/shared";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(
    async (currentPage: number, searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
        });
        if (searchTerm) params.set("search", searchTerm);

        const res = await apiFetch<PaginatedResponse<Customer>>(
          `/customers?${params}`
        );
        setCustomers(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load customers"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCustomers(page, search);
  }, [page, search, fetchCustomers]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} customer{total !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <span>+</span> Add Customer
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, phone, or ID card…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
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
                    Name
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Phone
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    ID Card
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Email
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-gray-400"
                    >
                      No customers found.{" "}
                      <Link
                        href="/customers/new"
                        className="text-primary-600 hover:underline"
                      >
                        Add one?
                      </Link>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {customer.phone}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {customer.idCardNumber}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {customer.email ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
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

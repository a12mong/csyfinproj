"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";
import type { CustomerWithDebtSummary, Sale, PaginatedResponse } from "@csyfinproj/shared";

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
  const [unlinking, setUnlinking] = useState(false);
  const [sendingGreeting, setSendingGreeting] = useState(false);
  const [windowOrigin, setWindowOrigin] = useState("http://localhost:3000");

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (customer && !customer.isLineLinked) {
      pollInterval = setInterval(async () => {
        try {
          const res = await apiFetch<{ isLineLinked: boolean; lineId: string | null; linePictureUrl: string | null }>(
            `/customers/${params.id}/link-status`
          );
          if (res.isLineLinked) {
            setCustomer((prev) =>
              prev
                ? {
                    ...prev,
                    isLineLinked: true,
                    lineId: res.lineId ?? undefined,
                    linePictureUrl: res.linePictureUrl,
                  }
                : null
            );
          }
        } catch (err) {
          console.error("Error polling LINE link status:", err);
        }
      }, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [customer?.isLineLinked, params.id]);

  async function handleUnlink() {
    if (!confirm("Are you sure you want to disconnect this customer's LINE account?")) {
      return;
    }
    setUnlinking(true);
    try {
      await apiFetch(`/customers/${params.id}/unlink-line`, { method: "POST" });
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              isLineLinked: false,
              lineId: undefined,
              linePictureUrl: undefined,
            }
          : null
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disconnect LINE account");
    } finally {
      setUnlinking(false);
    }
  }

  async function handleSendGreeting() {
    setSendingGreeting(true);
    try {
      await apiFetch("/notifications/send-greeting", {
        method: "POST",
        body: JSON.stringify({ customer_id: params.id }),
      });
      toastSuccess("ส่งข้อความทักทายเรียบร้อยแล้ว!");
    } catch (err) {
      alertError(err instanceof Error ? err.message : "ไม่สามารถส่งข้อความทักทายได้");
    } finally {
      setSendingGreeting(false);
    }
  }

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
            href={`/sales?open=new&customer_id=${customer.id}`}
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

        {/* LINE Connection Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 animate-fadeIn">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#06C755] text-white text-[10px] font-black">LINE</span>
            LINE Account Integration
          </h2>
          
          {customer.isLineLinked ? (
            <div className="flex items-start gap-4">
              {customer.linePictureUrl ? (
                <img
                  src={customer.linePictureUrl}
                  alt="LINE profile"
                  className="h-12 w-12 rounded-full object-cover shrink-0 border border-green-200 shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-[#06C755] shrink-0 border border-green-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">Connected</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 animate-pulse">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  This customer's record is successfully linked to their LINE account.
                </p>
                <div className="mt-2 font-mono text-xs text-gray-600 bg-gray-50 rounded-lg p-2 max-w-md truncate flex justify-between items-center border border-gray-100">
                  <span className="truncate flex-1">LINE ID: {customer.lineId}</span>
                  <button
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="text-red-600 hover:text-red-700 font-semibold text-xs ml-4 shrink-0 transition-colors"
                  >
                    {unlinking ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSendGreeting}
                    disabled={sendingGreeting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05b04b] text-white text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
                  >
                    💬 {sendingGreeting ? "กำลังส่ง..." : "ส่งข้อความทักทาย (Greeting)"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">Not Connected</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    Pending Setup
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Link this customer's LINE account to allow them to receive payment notifications, installment reminders, and automatically upload payment slips via our LINE Official Account.
                </p>
                <div className="pt-2">
                  <p className="text-xs font-medium text-gray-600 mb-1">Testing URL (Click to simulate):</p>
                  <a
                    href={`/customers/link-line/${customer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-medium text-primary-600 hover:underline break-all bg-primary-50 p-2 rounded-lg transition-all"
                  >
                    {`${windowOrigin}/customers/link-line/${customer.id}`}
                  </a>
                </div>
              </div>
              
              <div className="shrink-0 flex flex-col items-center p-3 border border-gray-100 bg-gray-50/50 rounded-xl text-center space-y-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `${windowOrigin}/customers/link-line/${customer.id}`
                  )}`}
                  alt="LINE Link QR Code"
                  className="w-[150px] h-[150px] bg-white rounded-lg shadow-sm border border-gray-100"
                />
                <p className="text-[10px] text-gray-400 font-medium max-w-[150px]">
                  Scan to link LINE account
                </p>
              </div>
            </div>
          )}
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
                href={`/sales?open=new&customer_id=${customer.id}`}
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

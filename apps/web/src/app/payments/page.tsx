"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import type {
  Installment,
  Payment,
  PaginatedResponse,
} from "@csyfinproj/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  overdue: "bg-red-50 text-red-700",
  partially_paid: "bg-orange-50 text-orange-700",
  paid: "bg-green-50 text-green-700",
};

interface PaymentWithInstallment extends Payment {
  installment?: Installment & {
    sale?: { customer?: { name: string } };
  };
}

function PaymentsContent() {
  const searchParams = useSearchParams();
  const preselectedInstallmentId = searchParams.get("installmentId") ?? "";

  // --- Record Payment Form ---
  const [installmentId, setInstallmentId] = useState(preselectedInstallmentId);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // --- Unverified Payments ---
  const [unverifiedPayments, setUnverifiedPayments] = useState<
    PaymentWithInstallment[]
  >([]);
  const [verifyLoading, setVerifyLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Load pending/overdue installments for dropdown
  const fetchInstallments = useCallback(async () => {
    try {
      const res = await apiFetch<PaginatedResponse<Installment>>(
        `/installments?status=pending,overdue,partially_paid`
      );
      setInstallments(res.data);
    } catch {
      // Non-fatal — form still usable if user knows their installment ID
    }
  }, []);

  // Load unverified payments
  const fetchUnverified = useCallback(async () => {
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await apiFetch<PaginatedResponse<PaymentWithInstallment>>(
        `/payments?verified=false`
      );
      setUnverifiedPayments(res.data);
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Failed to load payments"
      );
    } finally {
      setVerifyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstallments();
    fetchUnverified();
  }, [fetchInstallments, fetchUnverified]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSlipFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setSlipPreview(url);
    } else {
      setSlipPreview(null);
    }
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!installmentId || !amount || !paymentDate) {
      setSubmitError("Installment, amount, and date are required.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const formData = new FormData();
      formData.append("installment_id", installmentId);
      formData.append("amount", amount);
      formData.append("payment_date", paymentDate);
      if (notes) formData.append("notes", notes);
      if (slipFile) formData.append("slip_image", slipFile);

      const res = await fetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      setSubmitSuccess("Payment recorded successfully.");
      setAmount("");
      setNotes("");
      setSlipFile(null);
      setSlipPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Refresh lists
      fetchInstallments();
      fetchUnverified();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(paymentId: string, verified: boolean) {
    setVerifyingId(paymentId);
    try {
      await apiFetch(`/payments/${paymentId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ verified }),
      });
      fetchUnverified();
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Failed to verify payment"
      );
    } finally {
      setVerifyingId(null);
    }
  }

  const selectedInstallment = installments.find((i) => i.id === installmentId);

  return (
    <div className="px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Record payments and verify slip uploads
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Record Payment ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-base font-semibold text-gray-900">
              Record Payment
            </h2>
          </div>

          <form onSubmit={handleSubmitPayment} className="px-6 py-5 space-y-4">
            {/* Installment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Installment <span className="text-red-500">*</span>
              </label>
              {installments.length > 0 ? (
                <select
                  value={installmentId}
                  onChange={(e) => setInstallmentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                >
                  <option value="">Select installment…</option>
                  {installments.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      #{inst.installmentNumber} — Due{" "}
                      {formatDate(inst.dueDate)} —{" "}
                      {formatPrice(inst.amountDue - inst.amountPaid)} remaining
                      {inst.status === "overdue" ? " ⚠ overdue" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter installment ID"
                  value={installmentId}
                  onChange={(e) => setInstallmentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              )}
              {selectedInstallment && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Balance:{" "}
                  <span className="font-medium text-red-600">
                    {formatPrice(
                      selectedInstallment.amountDue -
                        selectedInstallment.amountPaid
                    )}
                  </span>{" "}
                  &middot; Status:{" "}
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      STATUS_STYLES[selectedInstallment.status] ??
                      "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {selectedInstallment.status}
                  </span>
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (THB) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Slip Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slip Image (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              />
              {slipPreview && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slipPreview}
                    alt="Slip preview"
                    className="max-h-48 rounded-lg border border-gray-200 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any additional notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              />
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {submitSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Recording…" : "Record Payment"}
            </button>
          </form>
        </div>

        {/* ── Unverified Payments ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Pending Verification
            </h2>
            <button
              onClick={fetchUnverified}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {verifyError && (
            <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {verifyError}
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {verifyLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-gray-50 rounded animate-pulse w-2/3" />
                </div>
              ))
            ) : unverifiedPayments.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No payments pending verification.
              </div>
            ) : (
              unverifiedPayments.map((payment) => (
                <div key={payment.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(payment.paymentDate)}
                        {payment.installment?.sale?.customer?.name && (
                          <span className="ml-1.5 text-gray-400">
                            &middot; {payment.installment.sale.customer.name}
                          </span>
                        )}
                      </p>
                      {payment.slipImageUrl && (
                        <a
                          href={payment.slipImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={payment.slipImageUrl}
                            alt="Slip"
                            className="h-20 rounded border border-gray-200 object-contain hover:opacity-80 transition-opacity"
                          />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleVerify(payment.id, true)}
                        disabled={verifyingId === payment.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors border border-green-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerify(payment.id, false)}
                        disabled={verifyingId === payment.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="px-8 py-8">
            <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        }
      >
        <PaymentsContent />
      </Suspense>
    </DashboardLayout>
  );
}

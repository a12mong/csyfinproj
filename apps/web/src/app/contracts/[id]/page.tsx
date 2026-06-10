"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError, confirm } from "@/lib/swal";
import type { ContractDetail, ContractInstallment, ContractParty } from "@csyfinproj/shared";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── Status configs ────────────────────────────────────────────────────────────

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  defaulted: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const INSTALLMENT_STATUS_STYLES: Record<ContractInstallment["status"], string> = {
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  paid: "bg-green-50 text-green-700 border border-green-200",
  overdue: "bg-red-50 text-red-700 border border-red-200",
  partially_paid: "bg-orange-50 text-orange-700 border border-orange-200",
};

const INSTALLMENT_STATUS_LABELS: Record<ContractInstallment["status"], string> = {
  pending: "ค้างชำระ (Pending)",
  paid: "ชำระครบแล้ว (Paid)",
  overdue: "เกินกำหนด (Overdue)",
  partially_paid: "ชำระบางส่วน (Partial)",
};

const CONTRACT_STATUSES: Array<{ value: string; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "defaulted", label: "Defaulted" },
  { value: "cancelled", label: "Cancelled" },
];

const CONTRACT_PARTY_ROLE_LABELS: Record<ContractParty["role"], string> = {
  owner: "Owner (Financial Institution)",
  buyer: "Buyer (Customer)",
  seller: "Seller (Shop)",
};

const CONTRACT_PARTY_ROLE_STYLES: Record<ContractParty["role"], string> = {
  owner: "bg-purple-50 text-purple-700",
  buyer: "bg-blue-50 text-blue-700",
  seller: "bg-green-50 text-green-700",
};

// ─── Info Row component ────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

// ─── Update Status Modal ───────────────────────────────────────────────────────

function UpdateStatusPanel({
  contractId,
  currentStatus,
  currentNotes,
  onUpdated,
}: {
  contractId: string;
  currentStatus: string;
  currentNotes?: string | null;
  onUpdated: (updated: ContractDetail) => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const ok = await confirm({
      title: "Update Contract?",
      text: `Change status to "${status}"?`,
      confirmText: "Update",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await apiFetch<{ data: ContractDetail }>(`/contracts/${contractId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes: notes.trim() || undefined }),
      });
      toastSuccess("Contract updated");
      onUpdated(res.data);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to update contract");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
        >
          {CONTRACT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="Optional notes…"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  const handlePrint = (type: "full" | "cover") => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    window.open(`${apiBaseUrl}/contracts/${params.id}/print/${type}`, "_blank");
  };

  useEffect(() => {
    async function fetchContract() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ data: ContractDetail }>(`/contracts/${params.id}`);
        setContract(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [params.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !contract) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "Contract not found."}
          </div>
          <Link href="/contracts" className="mt-4 inline-block text-sm text-primary-600 hover:underline">
            ← Back to Contracts
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const paidInstallments = contract.installments.filter((i) => i.status === "paid").length;
  const totalPaid = contract.payments.reduce((sum, p) => sum + p.amount, 0);

  // Determine if installments have amortization data
  const hasAmortizationData = contract.installments.some(
    (i) => i.principalPortion != null || i.interestPortion != null
  );

  // Contract parties from the response (may be undefined for older contracts)
  const contractParties: ContractParty[] = contract.contractParties ?? [];

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/contracts" className="hover:text-gray-700">Contracts</Link>
          <span>/</span>
          <span className="font-mono text-gray-700">{contract.contractNumber}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {contract.contractNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  CONTRACT_STATUS_STYLES[contract.status] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {contract.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Customer: <span className="font-medium text-gray-700">{contract.customer.name}</span>
              {" · "}
              {contract.customer.phone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint("full")}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              พิมพ์สัญญาฉบับเต็ม
            </button>
            <button
              onClick={() => handlePrint("cover")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              พิมพ์ใบปะหน้า
            </button>
            <button
              onClick={() => setShowActions((v) => !v)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {showActions ? "Hide Actions" : "Actions"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Summary */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Contract Summary</h2>
              </div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                <InfoRow label="Principal" value={formatPrice(contract.totalPrincipal)} />
                <InfoRow label="Interest Rate" value={`${contract.interestRate}% / yr`} />
                <InfoRow label="Total Interest" value={formatPrice(contract.totalInterest)} />
                <InfoRow
                  label="Total Amount"
                  value={
                    <span className="font-semibold text-gray-900">
                      {formatPrice(contract.totalAmount)}
                    </span>
                  }
                />
                <InfoRow label="# Installments" value={`${contract.numInstallments} months`} />
                <InfoRow label="Start Date" value={formatDate(contract.startDate)} />
                <InfoRow
                  label="Total Paid"
                  value={
                    <span className={totalPaid >= contract.totalAmount ? "text-green-700" : ""}>
                      {formatPrice(totalPaid)}
                    </span>
                  }
                />
                <InfoRow
                  label="Remaining"
                  value={formatPrice(Math.max(0, contract.totalAmount - totalPaid))}
                />
                {contract.notes && <InfoRow label="Notes" value={contract.notes} />}
                <InfoRow
                  label="Created by"
                  value={contract.createdBy?.name ?? "—"}
                />
              </div>
            </div>

            {/* Contract Parties (3-party display) */}
            {contractParties.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Contract Parties ({contractParties.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {contractParties.map((party) => (
                    <div key={party.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{party.partyName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {CONTRACT_PARTY_ROLE_LABELS[party.role] ?? party.role}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          CONTRACT_PARTY_ROLE_STYLES[party.role] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {party.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Sales */}
            {contract.contractSales.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Linked Sales ({contract.contractSales.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Motorcycle</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Finance Amount</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {contract.contractSales.map((cs) => (
                        <tr key={cs.id} className="border-b border-gray-50">
                          <td className="px-5 py-3 text-gray-600">{formatDate(cs.sale.saleDate)}</td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">
                              {cs.sale.motorcycle.brand} {cs.sale.motorcycle.model}{" "}
                              {cs.sale.motorcycle.year}
                            </p>
                            <p className="text-xs text-gray-500">{cs.sale.motorcycle.chassisNumber}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-900">
                            {formatPrice(cs.sale.financeAmount)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/sales/${cs.sale.id}`}
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
              </div>
            )}

            {/* Installment Schedule */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Installment Schedule
                </h2>
                <span className="text-xs text-gray-500">
                  {paidInstallments} / {contract.installments.length} paid
                </span>
              </div>
              {contract.installments.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No installments generated yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-center px-4 py-3 font-medium text-gray-500">#</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Due Date</th>
                        {hasAmortizationData && (
                          <>
                            <th className="text-right px-4 py-3 font-medium text-gray-500">Principal</th>
                            <th className="text-right px-4 py-3 font-medium text-gray-500">Interest</th>
                          </>
                        )}
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Amount Due</th>
                        {hasAmortizationData && (
                          <th className="text-right px-4 py-3 font-medium text-gray-500">Balance</th>
                        )}
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Paid</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Payments & Invoices</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.installments.map((inst) => {
                        const linkedPayments = (inst as any).payments || [];
                        return (
                          <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 text-center text-gray-500">{inst.installmentNumber}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(inst.dueDate)}</td>
                            {hasAmortizationData && (
                              <>
                                <td className="px-4 py-3 text-right text-gray-700">
                                  {inst.principalPortion != null
                                    ? formatPrice(Number(inst.principalPortion))
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-500">
                                  {inst.interestPortion != null && Number(inst.interestPortion) > 0
                                    ? formatPrice(Number(inst.interestPortion))
                                    : "—"}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3 text-right text-gray-900">{formatPrice(Number(inst.amountDue))}</td>
                            {hasAmortizationData && (
                              <td className="px-4 py-3 text-right text-gray-500">
                                {inst.remainingBalance != null
                                  ? formatPrice(Number(inst.remainingBalance))
                                  : "—"}
                              </td>
                            )}
                            <td className="px-4 py-3 text-right text-gray-600">
                              {Number(inst.amountPaid) > 0 ? (
                                <div>
                                  <p className="font-semibold text-gray-900">{formatPrice(Number(inst.amountPaid))}</p>
                                  {inst.status === "partially_paid" && (
                                    <p className="text-[10px] text-orange-600 font-medium">
                                      (ขาด {formatPrice(Number(inst.amountDue) - Number(inst.amountPaid))})
                                    </p>
                                  )}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            
                            {/* Payments & Invoices checklist */}
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {linkedPayments.length > 0 ? (
                                <div className="space-y-1.5 max-w-[280px]">
                                  {linkedPayments.map((p: any) => (
                                    <div key={p.id} className="border-b border-dashed border-gray-100 pb-1 last:border-0 last:pb-0">
                                      <div className="flex justify-between font-medium text-gray-800">
                                        <span>{formatPrice(p.amount)}</span>
                                        <span className="text-[10px] uppercase text-gray-400">{p.paymentChannel}</span>
                                      </div>
                                      <div className="flex justify-between text-[10px] text-gray-400">
                                        <span>{formatDate(p.paymentDate)}</span>
                                        <span className={p.verified ? "text-green-600 font-semibold" : "text-amber-500 font-semibold"}>
                                          {p.verified ? "Verified" : "Pending"}
                                        </span>
                                      </div>
                                      {/* Tax Invoices linked to this payment */}
                                      {p.taxInvoices && p.taxInvoices.map((inv: any) => (
                                        <div key={inv.id} className="flex justify-between items-center bg-gray-50 rounded px-1.5 py-0.5 mt-1 text-[10px]">
                                          <span className="font-mono text-gray-600">📄 {inv.invoiceNumber}</span>
                                          <a
                                            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/payments/invoices/${inv.id}/print`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-600 hover:text-primary-700 font-semibold"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                            }}
                                          >
                                            Print
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 font-light">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    INSTALLMENT_STATUS_STYLES[inst.status] ?? "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {INSTALLMENT_STATUS_LABELS[inst.status] ?? inst.status}
                                </span>
                                {inst.status === "partially_paid" && (
                                  <span className="text-[10px] text-orange-600 mt-1 font-semibold">
                                    ค้างจ่าย: {formatPrice(Number(inst.amountDue) - Number(inst.amountPaid))}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment History */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Payment History ({contract.payments.length})
                </h2>
              </div>
              {contract.payments.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Date</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Amount</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Channel</th>
                        <th className="text-center px-5 py-3 font-medium text-gray-500">Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-5 py-3 text-gray-600">{formatDate(payment.paymentDate)}</td>
                          <td className="px-5 py-3 text-right font-medium text-gray-900">
                            {formatPrice(payment.amount)}
                          </td>
                          <td className="px-5 py-3 text-gray-600 capitalize">
                            {payment.paymentChannel.replace("_", " ")}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {payment.verified ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right — sidebar */}
          <div className="space-y-6">
            {/* Customer Card */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer</h2>
              <p className="text-sm font-medium text-gray-900">{contract.customer.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{contract.customer.phone}</p>
              {contract.customer.idCardNumber && (
                <p className="text-xs text-gray-500">{contract.customer.idCardNumber}</p>
              )}
              <Link
                href={`/customers/${contract.customer.id}`}
                className="mt-3 block text-xs text-primary-600 hover:text-primary-700"
              >
                View customer profile →
              </Link>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Payment Progress</h2>
              {contract.installments.length > 0 ? (
                <>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{paidInstallments} paid</span>
                    <span>{contract.installments.length - paidInstallments} remaining</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.round((paidInstallments / contract.installments.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 text-right">
                    {Math.round((paidInstallments / contract.installments.length) * 100)}% complete
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">No installments yet.</p>
              )}
            </div>

            {/* Actions */}
            {showActions && (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Update Contract</h2>
                <UpdateStatusPanel
                  contractId={contract.id}
                  currentStatus={contract.status}
                  currentNotes={contract.notes}
                  onUpdated={(updated) =>
                    setContract((prev) => prev ? { ...prev, ...updated } : prev)
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

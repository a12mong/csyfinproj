"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { confirm, toastSuccess, alertError } from "@/lib/swal";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Installment,
  Payment,
  PaginatedResponse,
  Contract,
  Customer,
} from "@csyfinproj/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type ReferenceType = "customer" | "installment" | "contract" | "sale";

interface MotorcycleLite {
  id: string;
  brand: string;
  model: string;
  color: string;
  chassisNumber: string;
}

interface ContractWithBike extends Contract {
  contractSales?: Array<{ sale: { id: string; motorcycle?: MotorcycleLite } }>;
  _count?: { installments: number; payments: number };
}

interface InstallmentWithRefs extends Installment {
  sale?: { customer?: { name: string } };
  contract?: {
    contractNumber: string;
    customer?: { name: string; phone?: string };
  };
}
type VerifiedFilter = "all" | "pending" | "verified";

import { formatPrice, formatDate, TH } from "@/lib/format";

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
  taxInvoices?: Array<{
    id: string;
    invoiceNumber: string;
    type: string;
  }>;
}

function PaymentsContent() {
  const { hasAction } = useAuth();
  const canApprove = hasAction("payments", "approve_payment");
  const searchParams = useSearchParams();
  const preselectedInstallmentId = searchParams.get("installmentId") ?? "";

  // --- Reference type (customer-first; deep links with ?installmentId= keep installment mode) ---
  const [refType, setRefType] = useState<ReferenceType>(
    preselectedInstallmentId ? "installment" : "customer"
  );

  // --- Record Payment Form ---
  const [installmentId, setInstallmentId] = useState(preselectedInstallmentId);
  const [installments, setInstallments] = useState<InstallmentWithRefs[]>([]);

  // Customer reference state (walk-in flow)
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerContracts, setCustomerContracts] = useState<ContractWithBike[]>([]);
  const [customerContractsLoading, setCustomerContractsLoading] = useState(false);
  const [custContractId, setCustContractId] = useState("");
  const [custInstallments, setCustInstallments] = useState<Installment[]>([]);
  const [custInstallmentsLoading, setCustInstallmentsLoading] = useState(false);
  const [custInstallmentId, setCustInstallmentId] = useState("");

  // Contract reference state
  const [contractSearch, setContractSearch] = useState("");
  const [contractSearchLoading, setContractSearchLoading] = useState(false);
  const [foundContract, setFoundContract] = useState<Contract | null>(null);
  const [contractInstallments, setContractInstallments] = useState<Installment[]>([]);
  const [contractInstallmentId, setContractInstallmentId] = useState("");

  // Sale/PO reference state
  const [saleSearch, setSaleSearch] = useState("");
  const [saleSearchLoading, setSaleSearchLoading] = useState(false);
  const [saleContract, setSaleContract] = useState<Contract | null>(null);
  const [saleContractInstallments, setSaleContractInstallments] = useState<Installment[]>([]);
  const [saleInstallmentId, setSaleInstallmentId] = useState("");

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
  const [paymentChannel, setPaymentChannel] = useState<"cash" | "bank_transfer" | "line">("cash");

  // --- Payments Ledger ---
  const [payments, setPayments] = useState<PaymentWithInstallment[]>([]);
  const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterVerified, setFilterVerified] = useState<VerifiedFilter>("pending");
  const [verifyLoading, setVerifyLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Load open (unpaid/partial) installments for dropdown (installment reference mode)
  const fetchInstallments = useCallback(async () => {
    try {
      const res = await apiFetch<PaginatedResponse<InstallmentWithRefs>>(
        `/installments?open=true&limit=100`
      );
      setInstallments(res.data);
    } catch {
      // Non-fatal dropdown error
    }
  }, []);

  // Load payments based on filter + date
  const fetchPayments = useCallback(
    async (statusFilter: VerifiedFilter, date: string) => {
      setVerifyLoading(true);
      setVerifyError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter === "pending") params.set("verified", "false");
        if (statusFilter === "verified") params.set("verified", "true");
        if (date) params.set("date", date);

        const res = await apiFetch<PaginatedResponse<PaymentWithInstallment>>(
          `/payments?${params.toString()}`
        );
        setPayments(res.data);
      } catch (err) {
        setVerifyError(
          err instanceof Error ? err.message : "Failed to load payments"
        );
      } finally {
        setVerifyLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  useEffect(() => {
    fetchPayments(filterVerified, ledgerDate);
  }, [fetchPayments, filterVerified, ledgerDate]);

  // Debounced customer search (walk-in flow)
  useEffect(() => {
    if (refType !== "customer" || selectedCustomer) return;
    const q = customerSearch.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const res = await apiFetch<PaginatedResponse<Customer>>(
          `/customers?search=${encodeURIComponent(q)}&limit=8`
        );
        setCustomerResults(res.data);
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, refType, selectedCustomer]);

  function bikeLabel(contract: ContractWithBike): string | null {
    const bike = contract.contractSales?.find((cs) => cs.sale?.motorcycle)?.sale
      ?.motorcycle;
    if (!bike) return null;
    return `${bike.brand} ${bike.model} (${bike.color}) · คัสซี ${bike.chassisNumber}`;
  }

  async function loadContractInstallments(contractId: string) {
    setCustInstallmentsLoading(true);
    setCustInstallments([]);
    setCustInstallmentId("");
    try {
      const res = await apiFetch<PaginatedResponse<Installment>>(
        `/installments?contract_id=${contractId}&open=true&limit=100`
      );
      setCustInstallments(res.data);
      const oldest = res.data[0];
      if (oldest) {
        setCustInstallmentId(oldest.id);
        setAmount(String(oldest.amountDue - oldest.amountPaid));
      }
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to load installments");
    } finally {
      setCustInstallmentsLoading(false);
    }
  }

  async function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerResults([]);
    setCustomerContracts([]);
    setCustContractId("");
    setCustInstallments([]);
    setCustInstallmentId("");
    setCustomerContractsLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<ContractWithBike>>(
        `/contracts?customer_id=${customer.id}&status=active&limit=50`
      );
      setCustomerContracts(res.data);
      if (res.data.length === 1) {
        const only = res.data[0]!;
        setCustContractId(only.id);
        await loadContractInstallments(only.id);
      }
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally {
      setCustomerContractsLoading(false);
    }
  }

  function handleClearCustomer() {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerContracts([]);
    setCustContractId("");
    setCustInstallments([]);
    setCustInstallmentId("");
    setAmount("");
  }

  // Search for a contract by number
  async function handleContractSearch() {
    const q = contractSearch.trim();
    if (!q) return;
    setContractSearchLoading(true);
    setFoundContract(null);
    setContractInstallments([]);
    setContractInstallmentId("");
    try {
      const res = await apiFetch<PaginatedResponse<Contract>>(`/contracts?q=${encodeURIComponent(q)}`);
      const contract = res.data[0] ?? null;
      setFoundContract(contract);
      if (contract) {
        const instRes = await apiFetch<PaginatedResponse<Installment>>(
          `/installments?contract_id=${contract.id}&open=true`
        );
        const openInsts = instRes.data;
        setContractInstallments(openInsts);
        setContractInstallmentId(openInsts[0]?.id ?? "");
      }
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Contract search failed");
    } finally {
      setContractSearchLoading(false);
    }
  }

  // Search for a sale/PO and resolve to its contract
  async function handleSaleSearch() {
    const q = saleSearch.trim();
    if (!q) return;
    setSaleSearchLoading(true);
    setSaleContract(null);
    setSaleContractInstallments([]);
    setSaleInstallmentId("");
    try {
      const res = await apiFetch<PaginatedResponse<Contract>>(`/contracts?sale_id=${encodeURIComponent(q)}`);
      const contract = res.data[0] ?? null;
      setSaleContract(contract);
      if (contract) {
        const instRes = await apiFetch<PaginatedResponse<Installment>>(
          `/installments?contract_id=${contract.id}&open=true`
        );
        const openInsts = instRes.data;
        setSaleContractInstallments(openInsts);
        setSaleInstallmentId(openInsts[0]?.id ?? "");
      } else {
        alertError("ไม่พบสัญญาของรหัสการขายนี้");
      }
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Sale search failed");
    } finally {
      setSaleSearchLoading(false);
    }
  }

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

  function resetForm() {
    setAmount("");
    setNotes("");
    setSlipFile(null);
    setSlipPreview(null);
    setPaymentChannel("cash");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (refType === "customer") {
      handleClearCustomer();
    } else if (refType === "installment") {
      fetchInstallments();
    } else if (refType === "contract") {
      setFoundContract(null);
      setContractSearch("");
      setContractInstallments([]);
      setContractInstallmentId("");
    } else {
      setSaleContract(null);
      setSaleSearch("");
      setSaleContractInstallments([]);
      setSaleInstallmentId("");
    }
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("payment_date", paymentDate);
    formData.append("payment_channel", paymentChannel);
    if (notes) formData.append("notes", notes);
    if (slipFile) formData.append("slip_image", slipFile);

    if (refType === "customer") {
      if (!selectedCustomer || !custContractId) {
        setSubmitError("กรุณาค้นหาลูกค้าและเลือกสัญญาก่อน (Select a customer and contract first.)");
        return;
      }
      formData.append("contract_id", custContractId);
      if (custInstallmentId) {
        formData.append("installment_id", custInstallmentId);
      }
    } else if (refType === "installment") {
      if (!installmentId) {
        setSubmitError("Please select an installment.");
        return;
      }
      formData.append("installment_id", installmentId);
    } else if (refType === "contract") {
      if (!foundContract) {
        setSubmitError("Please search and select a contract first.");
        return;
      }
      formData.append("contract_id", foundContract.id);
      if (contractInstallmentId) {
        formData.append("installment_id", contractInstallmentId);
      }
    } else {
      if (!saleContract) {
        setSubmitError("Please search and select a sale/PO first.");
        return;
      }
      formData.append("contract_id", saleContract.id);
      if (saleInstallmentId) {
        formData.append("installment_id", saleInstallmentId);
      }
    }

    if (!amount || !paymentDate) {
      setSubmitError("Amount and date are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      toastSuccess("บันทึกการรับชำระเรียบร้อยแล้ว");
      setSubmitSuccess("บันทึกการรับชำระเรียบร้อยแล้ว");
      resetForm();
      fetchPayments(filterVerified, ledgerDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record payment";
      alertError(msg);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(paymentId: string, verified: boolean) {
    const confirmed = await confirm({
      title: verified ? "อนุมัติการชำระ?" : "ปฏิเสธการชำระ?",
      text: verified
        ? "ระบบจะยืนยันการชำระและออกใบกำกับภาษีอัตโนมัติ"
        : "ระบบจะปฏิเสธสลิปการชำระนี้",
      confirmText: verified ? "อนุมัติ" : "ปฏิเสธ",
      icon: verified ? "question" : "warning",
    });
    if (!confirmed) return;

    setVerifyingId(paymentId);
    try {
      await apiFetch(`/payments/${paymentId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ verified }),
      });
      toastSuccess(verified ? "อนุมัติและออกใบกำกับภาษีแล้ว" : "ปฏิเสธการชำระแล้ว");
      fetchPayments(filterVerified, ledgerDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to ${verified ? "approve" : "reject"} payment`;
      alertError(msg);
      setVerifyError(msg);
    } finally {
      setVerifyingId(null);
    }
  }

  const selectedInstallment = installments.find((i) => i.id === installmentId);

  return (
    <div className="px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">รับชำระค่างวดและตรวจสอบสลิป</h1>
        <p className="text-sm text-gray-500 mt-1">
          บันทึกการรับชำระ ตรวจสอบสลิปโอนเงิน และออกใบกำกับภาษี
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Record Payment ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm self-start">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-base font-semibold text-gray-900">
              บันทึกการรับชำระ
            </h2>
          </div>

          <form onSubmit={handleSubmitPayment} className="px-6 py-5 space-y-4">
            {/* Reference Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วิธีค้นหารายการ <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {(["customer", "installment", "contract", "sale"] as ReferenceType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setRefType(t); setSubmitError(null); }}
                    className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium border transition-colors ${
                      refType === t
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {t === "customer"
                      ? "ลูกค้า"
                      : t === "installment"
                      ? "งวดชำระ"
                      : t === "contract"
                      ? "เลขสัญญา"
                      : "รหัสการขาย"}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Customer reference (walk-in flow) ── */}
            {refType === "customer" && (
              <div className="space-y-3">
                {!selectedCustomer ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ค้นหาลูกค้า <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อ เบอร์โทร หรือเลขบัตรประชาชน…"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    {customerSearchLoading && (
                      <p className="mt-1.5 text-xs text-gray-400">กำลังค้นหา…</p>
                    )}
                    {!customerSearchLoading &&
                      customerSearch.trim().length >= 2 &&
                      customerResults.length === 0 && (
                        <p className="mt-1.5 text-xs text-gray-400">
                          ไม่พบลูกค้า — ลองค้นด้วยเบอร์โทรหรือเลขบัตรประชาชน
                        </p>
                      )}
                    {customerResults.length > 0 && (
                      <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                        {customerResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full px-3 py-2 text-left hover:bg-primary-50 transition-colors"
                            >
                              <span className="block text-sm font-medium text-gray-900">
                                {c.name}
                              </span>
                              <span className="block text-xs text-gray-500">
                                📞 {c.phone}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Selected customer card */}
                    <div className="flex items-start justify-between rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-primary-900">
                          {selectedCustomer.name}
                        </p>
                        <p className="text-xs text-primary-700">📞 {selectedCustomer.phone}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearCustomer}
                        className="text-xs font-medium text-primary-600 hover:text-primary-800 underline"
                      >
                        เปลี่ยนลูกค้า
                      </button>
                    </div>

                    {/* Contract picker */}
                    {customerContractsLoading ? (
                      <p className="text-xs text-gray-400">กำลังโหลดสัญญา…</p>
                    ) : customerContracts.length === 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        ลูกค้ารายนี้ไม่มีสัญญาที่กำลังผ่อนอยู่ (no active contracts)
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          สัญญา / รถ ที่มาชำระ <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {customerContracts.map((contract) => {
                            const bike = bikeLabel(contract);
                            const active = custContractId === contract.id;
                            return (
                              <button
                                key={contract.id}
                                type="button"
                                onClick={() => {
                                  setCustContractId(contract.id);
                                  loadContractInstallments(contract.id);
                                }}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                  active
                                    ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                                    : "border-gray-200 bg-white hover:border-gray-400"
                                }`}
                              >
                                <span className="block text-sm font-semibold text-gray-900 font-mono">
                                  {contract.contractNumber}
                                </span>
                                {bike && (
                                  <span className="block text-xs text-gray-600">🏍 {bike}</span>
                                )}
                                <span className="block text-xs text-gray-500">
                                  ยอดสัญญา {formatPrice(contract.totalAmount)} ·{" "}
                                  {contract.numInstallments} งวด
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Installment picker */}
                    {custContractId &&
                      (custInstallmentsLoading ? (
                        <p className="text-xs text-gray-400">กำลังโหลดงวด…</p>
                      ) : custInstallments.length === 0 ? (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                          สัญญานี้ไม่มีงวดค้างชำระแล้ว 🎉
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            const carried = custInstallments.filter(
                              (i) =>
                                i.status === "partially_paid" ||
                                new Date(i.dueDate) < new Date()
                            );
                            if (carried.length === 0) return null;
                            const carriedTotal = carried.reduce(
                              (s, i) => s + (i.amountDue - i.amountPaid),
                              0
                            );
                            return (
                              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                ⚠ ลูกค้ามียอดค้างจากงวดก่อนหน้า{" "}
                                <strong>{formatPrice(carriedTotal)}</strong> (
                                {carried
                                  .map(
                                    (i) =>
                                      `งวดที่ ${i.installmentNumber}${
                                        i.status === "partially_paid" ? " ชำระบางส่วน" : ""
                                      } ค้าง ${formatPrice(i.amountDue - i.amountPaid)}`
                                  )
                                  .join(" · ")}
                                ) — เลือกได้ว่าจะตัดยอดงวดค้างก่อน หรือตัดงวดปัจจุบัน
                              </div>
                            );
                          })()}
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            งวดที่ชำระ (เลือกงวดค้างเก่าสุดให้อัตโนมัติ)
                          </label>
                          <select
                            value={custInstallmentId}
                            onChange={(e) => {
                              setCustInstallmentId(e.target.value);
                              const inst = custInstallments.find(
                                (i) => i.id === e.target.value
                              );
                              if (inst) {
                                setAmount(String(inst.amountDue - inst.amountPaid));
                              }
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                          >
                            {custInstallments.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                งวดที่ {inst.installmentNumber} — ครบกำหนด{" "}
                                {formatDate(inst.dueDate)} — ค้าง{" "}
                                {formatPrice(inst.amountDue - inst.amountPaid)}
                                {inst.status === "partially_paid" ? " · ชำระบางส่วนแล้ว" : ""}
                                {new Date(inst.dueDate) < new Date() ? " ⚠ เกินกำหนด" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </>
                )}
              </div>
            )}

            {/* ── Installment reference ── */}
            {refType === "installment" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  งวดชำระ <span className="text-red-500">*</span>
                </label>
                {installments.length > 0 ? (
                  <select
                    value={installmentId}
                    onChange={(e) => setInstallmentId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  >
                    <option value="">เลือกงวด…</option>
                    {installments.map((inst) => {
                      const payerName =
                        inst.contract?.customer?.name ?? inst.sale?.customer?.name;
                      const contractNo = inst.contract?.contractNumber;
                      return (
                        <option key={inst.id} value={inst.id}>
                          {payerName ? `${payerName} — ` : ""}
                          {contractNo ? `${contractNo} — ` : ""}
                          งวดที่ {inst.installmentNumber} — ครบกำหนด {formatDate(inst.dueDate)} — ค้าง{" "}
                          {formatPrice(inst.amountDue - inst.amountPaid)}
                          {inst.status === "overdue" ? " ⚠ เกินกำหนด" : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="ใส่รหัสงวด"
                    value={installmentId}
                    onChange={(e) => setInstallmentId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                )}
                {selectedInstallment && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    ยอดค้าง:{" "}
                    <span className="font-medium text-red-600">
                      {formatPrice(
                        selectedInstallment.amountDue - selectedInstallment.amountPaid
                      )}
                    </span>{" "}
                    &middot; สถานะ:{" "}
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        STATUS_STYLES[selectedInstallment.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {TH.installmentStatus[selectedInstallment.status] ?? selectedInstallment.status}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* ── Contract reference ── */}
            {refType === "contract" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เลขที่สัญญา <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. CTR-202601-001"
                      value={contractSearch}
                      onChange={(e) => setContractSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleContractSearch())}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleContractSearch}
                      disabled={contractSearchLoading}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {contractSearchLoading ? "…" : "ค้นหา"}
                    </button>
                  </div>
                </div>

                {foundContract && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    <span className="font-semibold">{foundContract.contractNumber}</span>
                    {" · "}ยอดรวม {formatPrice(foundContract.totalAmount)}
                    {" · "}สถานะ {TH.contractStatus[foundContract.status] ?? foundContract.status}
                  </div>
                )}

                {contractInstallments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      งวดที่ชำระ (เลือกงวดค้างเก่าสุดให้อัตโนมัติ)
                    </label>
                    <select
                      value={contractInstallmentId}
                      onChange={(e) => setContractInstallmentId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                      {contractInstallments.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          งวดที่ {inst.installmentNumber} — ครบกำหนด {formatDate(inst.dueDate)} — ค้าง{" "}
                          {formatPrice(inst.amountDue - inst.amountPaid)}
                          {inst.status === "overdue" ? " ⚠ เกินกำหนด" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* ── Sale / PO reference ── */}
            {refType === "sale" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสการขาย <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="วางรหัสการขาย…"
                      value={saleSearch}
                      onChange={(e) => setSaleSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSaleSearch())}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaleSearch}
                      disabled={saleSearchLoading}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {saleSearchLoading ? "…" : "ค้นหา"}
                    </button>
                  </div>
                </div>

                {saleContract && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    สัญญา: <span className="font-semibold">{saleContract.contractNumber}</span>
                  </div>
                )}

                {saleContractInstallments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      งวดที่ชำระ (เลือกงวดค้างเก่าสุดให้อัตโนมัติ)
                    </label>
                    <select
                      value={saleInstallmentId}
                      onChange={(e) => setSaleInstallmentId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                    >
                      {saleContractInstallments.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          งวดที่ {inst.installmentNumber} — ครบกำหนด {formatDate(inst.dueDate)} — ค้าง{" "}
                          {formatPrice(inst.amountDue - inst.amountPaid)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                จำนวนเงิน (บาท) <span className="text-red-500">*</span>
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
                วันที่ชำระ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Payment Channel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ช่องทางชำระ
              </label>
              <select
                value={paymentChannel}
                onChange={(e) => setPaymentChannel(e.target.value as "cash" | "bank_transfer" | "line")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              >
                <option value="cash">เงินสด</option>
                <option value="bank_transfer">โอนธนาคาร</option>
                <option value="line">สลิปจากแชท LINE</option>
              </select>
            </div>

            {/* Slip Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รูปสลิป{paymentChannel === "bank_transfer" ? <span className="text-red-500"> *</span> : " (ไม่บังคับ)"}
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
                  <p className="text-xs text-gray-500 mb-1">ตัวอย่าง:</p>
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
                หมายเหตุ
              </label>
              <textarea
                rows={2}
                placeholder="บันทึกภายใน…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* Confirmation summary (customer mode) */}
            {refType === "customer" && selectedCustomer && custContractId && custInstallmentId && (
              (() => {
                const contract = customerContracts.find((c) => c.id === custContractId);
                const inst = custInstallments.find((i) => i.id === custInstallmentId);
                const bike = contract ? bikeLabel(contract) : null;
                return (
                  <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm text-primary-900 space-y-0.5">
                    <p className="font-semibold">สรุปการรับชำระ</p>
                    <p>
                      ลูกค้า: <strong>{selectedCustomer.name}</strong>
                      {contract && (
                        <>
                          {" "}· สัญญา <strong className="font-mono">{contract.contractNumber}</strong>
                        </>
                      )}
                    </p>
                    {bike && <p>รถ: {bike}</p>}
                    {inst && (
                      <p>
                        งวดที่ <strong>{inst.installmentNumber}</strong> · ค้างชำระ{" "}
                        <strong>{formatPrice(inst.amountDue - inst.amountPaid)}</strong> · รับชำระ{" "}
                        <strong className="text-primary-700">
                          {amount ? formatPrice(Number(amount)) : "—"}
                        </strong>
                      </p>
                    )}
                  </div>
                );
              })()
            )}

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
              className="w-full py-2.5 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? "กำลังบันทึก…" : "บันทึกการรับชำระ"}
            </button>
          </form>
        </div>

        {/* ── Transaction Ledger & Verification ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
          {/* Header & Filter Tabs */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">
                รายการรับชำระ
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={ledgerDate}
                  onChange={(e) => setLedgerDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
                />
                <button
                  onClick={() => fetchPayments(filterVerified, ledgerDate)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  รีเฟรช
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg">
              {(["all", "pending", "verified"] as VerifiedFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterVerified(tab)}
                  className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                    filterVerified === tab
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {tab === "all" ? "ทั้งหมด" : tab === "pending" ? "รอตรวจสอบ" : "ตรวจสอบแล้ว"}
                </button>
              ))}
            </div>
          </div>

          {verifyError && (
            <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {verifyError}
            </div>
          )}

          {/* List */}
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[680px] flex-1">
            {verifyLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-gray-50 rounded animate-pulse w-2/3" />
                </div>
              ))
            ) : payments.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400">
                ไม่มีรายการรับชำระตามเงื่อนไข
              </div>
            ) : (
              payments.map((payment) => {
                const customerName =
                  payment.installment?.sale?.customer?.name ??
                  payment.contract?.customer?.name;

                return (
                  <div key={payment.id} className={`px-5 py-4 hover:bg-gray-50/50 transition-colors ${!payment.verified ? "bg-amber-50/10" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-950 font-mono">
                            {formatPrice(payment.amount)}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              payment.verified
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                            }`}
                          >
                            {payment.verified ? "ตรวจสอบแล้ว" : "รออนุมัติ"}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-500">
                          วันที่ <strong>{formatDate(payment.paymentDate)}</strong> &middot; ช่องทาง {TH.paymentChannel[payment.paymentChannel] ?? payment.paymentChannel}
                        </p>
                        {customerName && (
                          <p className="text-xs text-gray-600">
                            ผู้ชำระ <strong>{customerName}</strong>
                          </p>
                        )}
                        {payment.contract?.contractNumber && (
                          <p className="text-xs text-blue-600 font-mono">
                            สัญญา <Link href={`/contracts/${payment.contractId}`} className="hover:underline font-semibold">{payment.contract.contractNumber}</Link>
                          </p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-gray-400 italic">หมายเหตุ: {payment.notes}</p>
                        )}

                        {payment.slipImageUrl && (
                          <div className="mt-2">
                            <a
                              href={payment.slipImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block hover:opacity-80 transition-opacity"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={payment.slipImageUrl}
                                alt="Slip"
                                className="h-16 rounded border border-gray-200 object-contain"
                              />
                            </a>
                          </div>
                        )}

                        {/* Tax Invoices Print Section */}
                        {payment.verified && payment.taxInvoices && payment.taxInvoices.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-dashed border-gray-100 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ใบกำกับภาษีที่ออกแล้ว:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {payment.taxInvoices.map((inv) => (
                                <div key={inv.id} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2.5 py-0.5 text-xs">
                                  <span className="font-mono text-gray-600 text-[11px]">📄 {inv.invoiceNumber} ({inv.type})</span>
                                  <button
                                    onClick={() => {
                                      window.open(`${API_BASE_URL}/payments/invoices/${inv.id}/print`, "_blank");
                                    }}
                                    className="text-primary-600 hover:text-primary-700 font-bold border-l border-gray-300 pl-2 text-[10px]"
                                  >
                                    พิมพ์
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Verify controls for pending payments */}
                      {!payment.verified && canApprove && (
                        <div className="flex gap-2 shrink-0 self-start">
                          <button
                            onClick={() => handleVerify(payment.id, true)}
                            disabled={verifyingId === payment.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors border border-green-200 shadow-sm"
                          >
                            อนุมัติ
                          </button>
                          <button
                            onClick={() => handleVerify(payment.id, false)}
                            disabled={verifyingId === payment.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200 shadow-sm"
                          >
                            ปฏิเสธ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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

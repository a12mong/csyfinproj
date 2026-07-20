"use client";

import { useEffect, useState, useCallback, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError, confirm } from "@/lib/swal";
import { formatPrice, formatDate, TH } from "@/lib/format";
import type {
  Customer,
  Sale,
  ContractListItem,
  PaginatedResponse,
} from "@csyfinproj/shared";

// ─── Customer type badge ──────────────────────────────────────────────────────

const CUSTOMER_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  personal: { label: TH.customerType.personal, className: "bg-blue-50 text-blue-700" },
  individual: { label: TH.customerType.individual, className: "bg-green-50 text-green-700" },
  finance: { label: TH.customerType.finance, className: "bg-amber-50 text-amber-700" },
};

function CustomerTypeBadge({ type }: { type: string }) {
  const style = CUSTOMER_TYPE_BADGE[type] ?? { label: type, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

// ─── Status config ────────────────────────────────────────────────────────────

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  defaulted: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "active", label: TH.contractStatus.active },
  { value: "completed", label: TH.contractStatus.completed },
  { value: "defaulted", label: TH.contractStatus.defaulted },
  { value: "cancelled", label: TH.contractStatus.cancelled },
];

const PAGE_SIZE = 20;

// ─── Amortization helpers ──────────────────────────────────────────────────────

interface AmortizationRow {
  num: number;
  dueDate: Date;
  principal: number;
  interest: number;
  balance: number;
  amountDue: number;
}

function computeAmortizationSchedule(
  principal: number,
  annualRate: number,
  numInstallments: number,
  startDate: Date
): AmortizationRow[] {
  if (numInstallments <= 0 || principal <= 0) return [];
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const rows: AmortizationRow[] = [];

  if (annualRate === 0) {
    const base = round2(principal / numInstallments);
    let remaining = principal;
    for (let i = 1; i <= numInstallments; i++) {
      const p = i === numInstallments ? round2(remaining) : base;
      remaining = round2(remaining - p);
      const due = new Date(startDate);
      due.setMonth(due.getMonth() + i);
      rows.push({ num: i, dueDate: due, principal: p, interest: 0, balance: remaining, amountDue: p });
    }
    return rows;
  }

  const r = annualRate / 12 / 100;
  const factor = Math.pow(1 + r, numInstallments);
  const emi = round2((principal * r * factor) / (factor - 1));

  let remaining = principal;
  for (let i = 1; i <= numInstallments; i++) {
    const interest = round2(remaining * r);
    let principalPart = i === numInstallments ? round2(remaining) : round2(emi - interest);
    remaining = round2(remaining - principalPart);
    const amountDue = i === numInstallments ? round2(principalPart + interest) : emi;
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + i);
    rows.push({ num: i, dueDate: due, principal: principalPart, interest, balance: remaining, amountDue });
  }

  return rows;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["ลูกค้า", "เลือกรายการขาย", "เงื่อนไข", "ตรวจสอบ"];

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center shrink-0">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  done
                    ? "bg-primary-600 text-white"
                    : active
                    ? "bg-primary-600 text-white ring-2 ring-primary-200"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? "✓" : step}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? "text-primary-700" : done ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="w-6 h-px bg-gray-200 mx-1.5" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1 — Customer ────────────────────────────────────────────────────────

function StepCustomer({
  selected,
  onSelect,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
}) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCustomers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (q) params.set("search", q);
      const res = await apiFetch<PaginatedResponse<Customer>>(`/customers?${params}`);
      setCustomers(res.data);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(search);
  }, [search, fetchCustomers]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">เลือกลูกค้า</h3>
      <input
        type="text"
        placeholder="ค้นหาด้วยชื่อ เบอร์โทร หรือเลขบัตรประชาชน…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 mb-3 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))
        ) : customers.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">ไม่พบลูกค้า</p>
        ) : (
          customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                selected?.id === c.id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                {c.type && <CustomerTypeBadge type={c.type} />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {c.phone} · {c.idCardNumber}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Step 2 — Link Sales ──────────────────────────────────────────────────────

function StepSales({
  customerId,
  selectedIds,
  onToggleSale,
}: {
  customerId: string;
  selectedIds: string[];
  onToggleSale: (sale: Sale) => void;
}) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<Sale>>(
      `/sales?customer_id=${customerId}&payment_method=installment&status=active&limit=50`
    )
      .then((res) => setSales(res.data))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">เลือกรายการขายที่จะเชื่อมโยง</h3>
      <p className="text-xs text-gray-500 mb-3">
        ไม่บังคับ เลือกรายการขายแบบผ่อนที่ต้องการเชื่อมโยง ระบบจะแนะนำเงินต้นจากรายการที่เลือกให้อัตโนมัติ
      </p>
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse mb-2" />
        ))
      ) : sales.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          ไม่พบรายการขายแบบผ่อนที่กำลังผ่อนของลูกค้ารายนี้
        </p>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {sales.map((sale) => {
            const isSelected = selectedIds.includes(sale.id);
            return (
              <button
                key={sale.id}
                type="button"
                onClick={() => onToggleSale(sale)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary-600 border-primary-600" : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs font-bold leading-none">✓</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(sale.saleDate)}
                        {sale.numInstallments ? ` · ${sale.numInstallments} งวด` : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        ยอดจัด: {formatPrice(sale.financeAmount)} · ราคารวม: {formatPrice(sale.totalPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {selectedIds.length > 0 && (
        <p className="mt-2 text-xs text-primary-600 font-medium">
          เลือกแล้ว {selectedIds.length} รายการ
        </p>
      )}
    </div>
  );
}

// ─── Step 3 — Contract Terms ──────────────────────────────────────────────────

interface TermsForm {
  total_principal: string;
  interest_rate: string;
  num_installments: string;
  start_date: string;
  notes: string;
}

function StepTerms({
  form,
  onChange,
  errors,
  suggestedPrincipal,
}: {
  form: TermsForm;
  onChange: (f: TermsForm) => void;
  errors: Partial<Record<keyof TermsForm, string>>;
  suggestedPrincipal: number;
}) {
  const set = (field: keyof TermsForm, value: string) =>
    onChange({ ...form, [field]: value });

  const principal = parseFloat(form.total_principal) || 0;
  const rate = parseFloat(form.interest_rate) || 0;
  const n = parseInt(form.num_installments) || 0;

  // Compute preview totals using EMI formula (matches backend logic)
  let totalInterest = 0;
  let totalAmount = principal;
  let monthlyPayment = 0;
  if (n > 0 && principal > 0) {
    if (rate === 0) {
      totalInterest = 0;
      totalAmount = principal;
      monthlyPayment = Math.round((principal / n) * 100) / 100;
    } else {
      const r = rate / 12 / 100;
      const factor = Math.pow(1 + r, n);
      monthlyPayment = Math.round(((principal * r * factor) / (factor - 1)) * 100) / 100;
      totalAmount = Math.round(monthlyPayment * (n - 1) * 100) / 100;
      // Approximate; exact total computed server-side
      totalInterest = Math.round((totalAmount - principal) * 100) / 100;
      totalAmount = principal + totalInterest;
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">เงื่อนไขสัญญา</h3>

      {suggestedPrincipal > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
          <p className="text-sm text-blue-700">
            เงินต้นแนะนำจากรายการขายที่เลือก:{" "}
            <strong>{formatPrice(suggestedPrincipal)}</strong>
          </p>
          <button
            type="button"
            onClick={() => set("total_principal", String(suggestedPrincipal))}
            className="text-xs text-blue-600 font-medium hover:text-blue-800 ml-3 shrink-0"
          >
            ใช้ค่านี้
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            เงินต้น (บาท) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.total_principal}
            onChange={(e) => set("total_principal", e.target.value)}
            placeholder={suggestedPrincipal > 0 ? String(suggestedPrincipal) : "เช่น 50000"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.total_principal && (
            <p className="mt-1 text-xs text-red-600">{errors.total_principal}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            อัตราดอกเบี้ย (% ต่อปี)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.interest_rate}
            onChange={(e) => set("interest_rate", e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนงวด <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={form.num_installments}
            onChange={(e) => set("num_installments", e.target.value)}
            placeholder="12"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.num_installments && (
            <p className="mt-1 text-xs text-red-600">{errors.num_installments}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่เริ่มสัญญา <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.start_date && (
            <p className="mt-1 text-xs text-red-600">{errors.start_date}</p>
          )}
        </div>
      </div>

      {principal > 0 && n > 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>เงินต้น</span>
            <span>{formatPrice(principal)}</span>
          </div>
          {totalInterest > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>ดอกเบี้ยรวม</span>
              <span>{formatPrice(totalInterest)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
            <span>ยอดรวมทั้งหมด</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>ค่างวดต่อเดือน (โดยประมาณ)</span>
            <span>{formatPrice(monthlyPayment)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)…"
        />
      </div>
    </div>
  );
}

// ─── Step 4 — Preview ─────────────────────────────────────────────────────────

function StepPreview({
  customer,
  form,
  saleCount,
}: {
  customer: Customer;
  form: TermsForm;
  saleCount: number;
}) {
  const principal = parseFloat(form.total_principal) || 0;
  const rate = parseFloat(form.interest_rate) || 0;
  const n = parseInt(form.num_installments) || 0;
  const startDate = form.start_date ? new Date(form.start_date) : null;

  const schedule = startDate && n > 0 && principal > 0
    ? computeAmortizationSchedule(principal, rate, n, startDate)
    : [];

  // Summary totals
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const totalAmount = principal + totalInterest;

  const previewRows = schedule.slice(0, 6);
  const hasMore = schedule.length > 6;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">ยืนยันและตรวจสอบ</h3>
      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200 mb-4">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">ลูกค้า</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
            {customer.type && <CustomerTypeBadge type={customer.type} />}
          </div>
          <p className="text-xs text-gray-500">{customer.phone}</p>
        </div>
        <div className="px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">เงินต้น</span>
            <span className="font-medium">{formatPrice(principal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">อัตราดอกเบี้ย</span>
            <span className="font-medium">{form.interest_rate || 0}% ต่อปี</span>
          </div>
          {totalInterest > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">ดอกเบี้ยรวม</span>
              <span className="font-medium">{formatPrice(totalInterest)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900">
            <span>ยอดรวมทั้งหมด</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">จำนวนงวด</span>
            <span className="font-medium">{n} งวด</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">วันที่เริ่มสัญญา</span>
            <span className="font-medium">
              {form.start_date ? formatDate(form.start_date) : "—"}
            </span>
          </div>
          {saleCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">รายการขายที่เชื่อมโยง</span>
              <span className="font-medium">{saleCount}</span>
            </div>
          )}
        </div>
      </div>

      {previewRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            ตารางผ่อนชำระ {n > 6 ? `(แสดง 6 จาก ${n} งวด)` : ""}
          </p>
          <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">กำหนดชำระ</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">เงินต้น</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">ดอกเบี้ย</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">รวม</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.num} className="border-b border-gray-50">
                      <td className="px-3 py-1.5 text-gray-600">{row.num}</td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {formatDate(row.dueDate.toISOString())}
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-700">
                        {formatPrice(row.principal)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-500">
                        {row.interest > 0 ? formatPrice(row.interest) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-gray-900">
                        {formatPrice(row.amountDue)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-500">
                        {formatPrice(row.balance)}
                      </td>
                    </tr>
                  ))}
                  {hasMore && (
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-center text-gray-400">
                        + อีก {n - 6} งวด
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Contract Form ────────────────────────────────────────────────────────

const INITIAL_TERMS: TermsForm = {
  total_principal: "",
  interest_rate: "0",
  num_installments: "12",
  start_date: "",
  notes: "",
};

interface NewContractFormProps {
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  prefilledCustomerId?: string | null;
  prefilledSaleId?: string | null;
}

function NewContractForm({
  onSuccess,
  onCancel,
  prefilledCustomerId,
  prefilledSaleId,
}: NewContractFormProps) {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  // Track full Sale objects to compute suggested principal
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [terms, setTerms] = useState<TermsForm>(INITIAL_TERMS);
  const [termsErrors, setTermsErrors] = useState<Partial<Record<keyof TermsForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load prefilled customer and sale if provided in query params
  useEffect(() => {
    if (!prefilledCustomerId) return;

    async function loadPrefilled() {
      try {
        const customerRes = await apiFetch<{ data: Customer }>(`/customers/${prefilledCustomerId}`);
        setCustomer(customerRes.data);

        if (prefilledSaleId) {
          const saleRes = await apiFetch<{ data: Sale }>(`/sales/${prefilledSaleId}`);
          const sale = saleRes.data;

          setSelectedSales([sale]);
          setTerms({
            total_principal: String(sale.financeAmount),
            interest_rate: String(sale.interestRate ?? 0),
            num_installments: String(sale.numInstallments ?? 12),
            start_date: sale.saleDate ? new Date(sale.saleDate).toISOString().split("T")[0] : "",
            notes: "",
          });
          setStep(3);
        } else {
          setStep(2);
        }
      } catch (err) {
        console.error("Failed to load prefilled customer/sale", err);
      }
    }
    loadPrefilled();
  }, [prefilledCustomerId, prefilledSaleId]);

  const saleIds = selectedSales.map((s) => s.id);

  // Sum of finance amounts from selected sales
  const suggestedPrincipal = selectedSales.reduce(
    (sum, s) => sum + (s.financeAmount ?? 0),
    0
  );

  function toggleSale(sale: Sale) {
    setSelectedSales((prev) => {
      const exists = prev.find((s) => s.id === sale.id);
      return exists ? prev.filter((s) => s.id !== sale.id) : [...prev, sale];
    });
  }

  function validateTerms(): boolean {
    const errors: Partial<Record<keyof TermsForm, string>> = {};
    if (!terms.total_principal || parseFloat(terms.total_principal) <= 0) {
      errors.total_principal = "กรุณากรอกเงินต้นที่ถูกต้อง";
    }
    if (!terms.num_installments || parseInt(terms.num_installments) < 1) {
      errors.num_installments = "กรุณากรอกจำนวนงวดที่ถูกต้อง";
    }
    if (!terms.start_date) {
      errors.start_date = "กรุณาเลือกวันที่เริ่มสัญญา";
    }
    setTermsErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (step === 3 && !validateTerms()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customer) return;
    const ok = await confirm({
      title: "สร้างสัญญา?",
      text: "ระบบจะสร้างตารางผ่อนชำระ ดำเนินการต่อหรือไม่?",
      confirmText: "สร้างสัญญา",
    });
    if (!ok) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: Record<string, unknown> = {
        customer_id: customer.id,
        total_principal: parseFloat(terms.total_principal),
        interest_rate: parseFloat(terms.interest_rate) || 0,
        num_installments: parseInt(terms.num_installments),
        start_date: terms.start_date,
        generate_installments: true,
      };
      if (saleIds.length > 0) body.sale_ids = saleIds;
      if (terms.notes.trim()) body.notes = terms.notes.trim();

      const res = await apiFetch<{ data: { id: string } }>("/contracts", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toastSuccess("สร้างสัญญาสำเร็จ");
      onSuccess(res.data.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ไม่สามารถสร้างสัญญาได้";
      setSubmitError(msg);
      alertError(msg);
      setSubmitting(false);
    }
  }

  const canAdvance =
    (step === 1 && customer !== null) ||
    step === 2 ||
    step === 3;

  return (
    <form onSubmit={handleSubmit}>
      <StepIndicator current={step} />

      {step === 1 && <StepCustomer selected={customer} onSelect={setCustomer} />}
      {step === 2 && customer && (
        <StepSales
          customerId={customer.id}
          selectedIds={saleIds}
          onToggleSale={toggleSale}
        />
      )}
      {step === 3 && (
        <StepTerms
          form={terms}
          onChange={setTerms}
          errors={termsErrors}
          suggestedPrincipal={suggestedPrincipal}
        />
      )}
      {step === 4 && customer && (
        <StepPreview customer={customer} form={terms} saleCount={saleIds.length} />
      )}

      {submitError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ย้อนกลับ
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            ถัดไป
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "กำลังสร้าง…" : "ยืนยันสร้างสัญญา"}
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Contracts Page ───────────────────────────────────────────────────────────

function ContractsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const customerIdParam = searchParams.get("customer_id");
  const saleIdParam = searchParams.get("sale_id");

  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Auto-open modal when arriving via ?open=new
  useEffect(() => {
    if (openParam === "new") {
      setShowNewModal(true);
    }
  }, [openParam]);

  const fetchContracts = useCallback(
    async (currentPage: number, status: string, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(currentPage) });
        if (status) params.set("status", status);
        if (q) params.set("q", q);
        const res = await apiFetch<{ data: ContractListItem[]; total: number; page: number }>(
          `/contracts?${params}`
        );
        setContracts(res.data);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลสัญญาได้");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchContracts(page, statusFilter, search);
  }, [page, statusFilter, search, fetchContracts]);

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleContractSuccess(contractId: string) {
    setShowNewModal(false);
    router.push(`/contracts/${contractId}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">สัญญาเช่าซื้อ</h1>
            <p className="text-sm text-gray-500 mt-1">
              ทั้งหมด {total} สัญญา
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <span>+</span> สร้างสัญญา
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="ค้นหาเลขที่สัญญา…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-56"
          />
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
                  <th className="text-left px-5 py-3 font-medium text-gray-500">เลขที่สัญญา</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">ลูกค้า</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">ยอดรวม</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">สถานะ</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">วันที่เริ่ม</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">จำนวนงวด</th>
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
                ) : contracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                      ไม่พบสัญญา{" "}
                      <button
                        onClick={() => setShowNewModal(true)}
                        className="text-primary-600 hover:underline"
                      >
                        สร้างสัญญาใหม่?
                      </button>
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">
                        {contract.contractNumber}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{contract.customer.name}</p>
                        <p className="text-xs text-gray-500">{contract.customer.phone}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatPrice(contract.totalAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            CONTRACT_STATUS_STYLES[contract.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {TH.contractStatus[contract.status] ?? contract.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {formatDate(contract.startDate)}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">
                        {contract._count.installments}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          ดูรายละเอียด
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
                หน้า {page} จาก {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  ก่อนหน้า
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Contract Modal */}
      <FormModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="สร้างสัญญา"
        maxWidth="max-w-2xl"
      >
        <NewContractForm
          onSuccess={handleContractSuccess}
          onCancel={() => setShowNewModal(false)}
          prefilledCustomerId={customerIdParam}
          prefilledSaleId={saleIdParam}
        />
      </FormModal>
    </DashboardLayout>
  );
}

export default function ContractsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="px-8 py-8 animate-pulse text-gray-500">
            กำลังโหลด...
          </div>
        </DashboardLayout>
      }
    >
      <ContractsPageContent />
    </Suspense>
  );
}

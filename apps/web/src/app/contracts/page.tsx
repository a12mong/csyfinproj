"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError, confirm } from "@/lib/swal";
import type {
  Customer,
  Sale,
  ContractListItem,
  PaginatedResponse,
} from "@csyfinproj/shared";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── Customer type badge ──────────────────────────────────────────────────────

const CUSTOMER_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  personal: { label: "Personal", className: "bg-blue-50 text-blue-700" },
  individual: { label: "Individual", className: "bg-green-50 text-green-700" },
  finance: { label: "Finance", className: "bg-amber-50 text-amber-700" },
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
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "defaulted", label: "Defaulted" },
  { value: "cancelled", label: "Cancelled" },
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

const STEPS = ["Customer", "Sales", "Terms", "Preview"];

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
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Customer</h3>
      <input
        type="text"
        placeholder="Search by name, phone, or ID card…"
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
          <p className="text-sm text-gray-400 py-4 text-center">No customers found.</p>
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
      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Link Sales Orders</h3>
      <p className="text-xs text-gray-500 mb-3">
        Optional. Select installment sales to link. Principal will be auto-suggested from selected
        sales.
      </p>
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse mb-2" />
        ))
      ) : sales.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No active installment sales found for this customer.
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
                        {sale.numInstallments ? ` · ${sale.numInstallments} installments` : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        Finance: {formatPrice(sale.financeAmount)} · Total: {formatPrice(sale.totalPrice)}
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
          {selectedIds.length} sale(s) selected
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
      <h3 className="text-sm font-semibold text-gray-900">Contract Terms</h3>

      {suggestedPrincipal > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
          <p className="text-sm text-blue-700">
            Suggested principal from linked sales:{" "}
            <strong>{formatPrice(suggestedPrincipal)}</strong>
          </p>
          <button
            type="button"
            onClick={() => set("total_principal", String(suggestedPrincipal))}
            className="text-xs text-blue-600 font-medium hover:text-blue-800 ml-3 shrink-0"
          >
            Apply
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Principal (THB) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.total_principal}
            onChange={(e) => set("total_principal", e.target.value)}
            placeholder={suggestedPrincipal > 0 ? String(suggestedPrincipal) : "e.g. 50000"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.total_principal && (
            <p className="mt-1 text-xs text-red-600">{errors.total_principal}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (% / yr)
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
            # Installments <span className="text-red-500">*</span>
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
            Start Date <span className="text-red-500">*</span>
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
            <span>Principal</span>
            <span>{formatPrice(principal)}</span>
          </div>
          {totalInterest > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Total interest</span>
              <span>{formatPrice(totalInterest)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total amount</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Monthly payment (~)</span>
            <span>{formatPrice(monthlyPayment)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
          placeholder="Optional notes…"
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
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Confirm & Preview</h3>
      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200 mb-4">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Customer</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
            {customer.type && <CustomerTypeBadge type={customer.type} />}
          </div>
          <p className="text-xs text-gray-500">{customer.phone}</p>
        </div>
        <div className="px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Principal</span>
            <span className="font-medium">{formatPrice(principal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Interest rate</span>
            <span className="font-medium">{form.interest_rate || 0}% / yr</span>
          </div>
          {totalInterest > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Total interest</span>
              <span className="font-medium">{formatPrice(totalInterest)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total amount</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Installments</span>
            <span className="font-medium">{n} months</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Start date</span>
            <span className="font-medium">
              {form.start_date ? formatDate(form.start_date) : "—"}
            </span>
          </div>
          {saleCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Linked sales</span>
              <span className="font-medium">{saleCount}</span>
            </div>
          )}
        </div>
      </div>

      {previewRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Amortization Schedule {n > 6 ? `(first 6 of ${n})` : ""}
          </p>
          <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Due Date</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Principal</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Interest</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Balance</th>
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
                        + {n - 6} more installments
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
}

function NewContractForm({ onSuccess, onCancel }: NewContractFormProps) {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  // Track full Sale objects to compute suggested principal
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [terms, setTerms] = useState<TermsForm>(INITIAL_TERMS);
  const [termsErrors, setTermsErrors] = useState<Partial<Record<keyof TermsForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      errors.total_principal = "Enter a valid principal amount";
    }
    if (!terms.num_installments || parseInt(terms.num_installments) < 1) {
      errors.num_installments = "Enter a valid number of installments";
    }
    if (!terms.start_date) {
      errors.start_date = "Select a start date";
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
      title: "Create Contract?",
      text: "This will generate the installment schedule. Continue?",
      confirmText: "Create",
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
      toastSuccess("Contract created successfully");
      onSuccess(res.data.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create contract";
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
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating…" : "Confirm & Create Contract"}
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Contracts Page ───────────────────────────────────────────────────────────

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

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
        setError(err instanceof Error ? err.message : "Failed to load contracts");
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
            <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} contract{total !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <span>+</span> New Contract
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search contract number…"
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
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Contract #</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Customer</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Total Amount</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Start Date</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">Installments</th>
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
                      No contracts found.{" "}
                      <button
                        onClick={() => setShowNewModal(true)}
                        className="text-primary-600 hover:underline"
                      >
                        Create one?
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
                          {contract.status}
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

      {/* New Contract Modal */}
      <FormModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Contract"
        maxWidth="max-w-2xl"
      >
        <NewContractForm
          onSuccess={handleContractSuccess}
          onCancel={() => setShowNewModal(false)}
        />
      </FormModal>
    </DashboardLayout>
  );
}

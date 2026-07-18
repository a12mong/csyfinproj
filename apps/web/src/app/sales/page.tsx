"use client";

import { useEffect, useState, useCallback, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { confirm, toastSuccess, alertError } from "@/lib/swal";
import type {
  Customer,
  Motorcycle,
  Addon,
  Sale,
  SaleWithInstallments,
  PaginatedResponse,
  FinancialInstitution,
} from "@csyfinproj/shared";

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

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Invoice Customer", "Motorcycle", "Pricing", "Add-ons", "Confirm"];

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
      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Select Invoice Customer</h3>
      <p className="text-xs text-gray-500 mb-3">The customer who will receive the invoice.</p>
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
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.phone} · {c.idCardNumber}
                  </p>
                </div>
                {c.type && <CustomerTypeBadge type={c.type} />}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Step 2 — Motorcycle ──────────────────────────────────────────────────────

function StepMotorcycle({
  selected,
  onSelect,
}: {
  selected: Motorcycle | null;
  onSelect: (m: Motorcycle) => void;
}) {
  const [search, setSearch] = useState("");
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMotos = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "in_stock", limit: "20" });
      if (q) params.set("search", q);
      const res = await apiFetch<PaginatedResponse<Motorcycle>>(`/motorcycles?${params}`);
      setMotorcycles(res.data);
    } catch {
      setMotorcycles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMotos(search);
  }, [search, fetchMotos]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Select Motorcycle</h3>
      <p className="text-xs text-gray-400 mb-3">In stock only</p>
      <input
        type="text"
        placeholder="Search model, chassis, color…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 mb-3 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))
        ) : motorcycles.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No motorcycles in stock.</p>
        ) : (
          motorcycles.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                selected?.id === m.id
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {m.brand} {m.model} {m.year}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {m.color} · {m.chassisNumber}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0 ml-2">
                  {formatPrice(m.sellingPrice)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Step 3 — Pricing ─────────────────────────────────────────────────────────

type PaymentMethod = "cash" | "installment" | "finance_company";

interface PricingForm {
  payment_method: PaymentMethod;
  total_price: string;
  down_payment: string;
  notes: string;
  finance_company_name?: string;
  commission_amount?: string;
  financial_institution_id?: string;
  finance_reference_number?: string;
}

// Display labels — includes finance_company for backward-compat display in table
const PAYMENT_METHOD_DISPLAY: Record<string, string> = {
  cash: "Cash",
  installment: "Installment",
  finance_company: "Finance Company",
};

function StepPricing({
  motorcycle,
  form,
  onChange,
  errors,
  invoiceCustomer,
  buyerCustomer,
  onBuyerCustomerChange,
  buyerCustomerError,
}: {
  motorcycle: Motorcycle;
  form: PricingForm;
  onChange: (f: PricingForm) => void;
  errors: Partial<PricingForm>;
  invoiceCustomer: Customer | null;
  buyerCustomer: Customer | null;
  onBuyerCustomerChange: (c: Customer | null) => void;
  buyerCustomerError?: string | null;
}) {
  const [buyerSearch, setBuyerSearch] = useState("");
  const [buyerCandidates, setBuyerCandidates] = useState<Customer[]>([]);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [institutions, setInstitutions] = useState<FinancialInstitution[]>([]);

  useEffect(() => {
    apiFetch<{ data: FinancialInstitution[] }>("/financial-institutions?active=true")
      .then((res) => setInstitutions(res.data))
      .catch(() => setInstitutions([]));
  }, []);

  const set = (field: keyof PricingForm, value: string) =>
    onChange({ ...form, [field]: value });

  const isCash = form.payment_method === "cash";
  const requiresBuyer = invoiceCustomer?.type === "finance";
  const totalPrice = parseFloat(form.total_price) || 0;
  const downPayment = parseFloat(form.down_payment) || 0;
  const financeAmount = Math.max(0, totalPrice - downPayment);
  const effectiveTotalPrice = totalPrice > 0 ? totalPrice : Number(motorcycle.sellingPrice);

  // Pre-fill finance company name if invoice customer is type finance
  useEffect(() => {
    if (
      form.payment_method === "finance_company" &&
      invoiceCustomer &&
      invoiceCustomer.type === "finance" &&
      !form.finance_company_name
    ) {
      onChange({
        ...form,
        finance_company_name: invoiceCustomer.name,
      });
    }
  }, [form.payment_method, invoiceCustomer]);

  const fetchBuyerCandidates = useCallback(async (q: string) => {
    setBuyerLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", type: "personal,individual" });
      if (q) params.set("search", q);
      const res = await apiFetch<PaginatedResponse<Customer>>(`/customers?${params}`);
      setBuyerCandidates(res.data);
    } catch {
      setBuyerCandidates([]);
    } finally {
      setBuyerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!requiresBuyer) return;
    fetchBuyerCandidates(buyerSearch);
  }, [buyerSearch, requiresBuyer, fetchBuyerCandidates]);

  // Synchronize buyer customer when requiresBuyer is false
  useEffect(() => {
    if (!requiresBuyer) {
      if (buyerCustomer?.id !== invoiceCustomer?.id) {
        onBuyerCustomerChange(invoiceCustomer);
      }
    } else {
      if (buyerCustomer?.id === invoiceCustomer?.id) {
        onBuyerCustomerChange(null);
      }
    }
  }, [requiresBuyer, invoiceCustomer, onBuyerCustomerChange, buyerCustomer]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Configure Pricing</h3>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Payment Method
        </label>
        <div className="flex gap-2">
          {(["cash", "installment", "finance_company"] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => {
                const isCashVal = method === "cash";
                const totalPriceVal = parseFloat(form.total_price) || Number(motorcycle.sellingPrice);
                const nextDown = isCashVal
                  ? String(totalPriceVal)
                  : String(Math.round(totalPriceVal * 0.25));
                onChange({
                  ...form,
                  payment_method: method,
                  down_payment: nextDown,
                });
              }}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.payment_method === method
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {PAYMENT_METHOD_DISPLAY[method]}
            </button>
          ))}
        </div>
      </div>

      {/* Cash notice */}
      {isCash && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
          <span className="text-green-600 text-sm">✓</span>
          <p className="text-sm text-green-700">
            Cash sales are marked as <strong>completed</strong> immediately upon creation.
          </p>
        </div>
      )}

      {/* Installment notice */}
      {form.payment_method === "installment" && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
          <span className="text-blue-500 text-base leading-none">ℹ</span>
          <p className="text-sm text-blue-700">
            Installment sales create contracts with the store (CSY).
          </p>
        </div>
      )}

      {/* Finance Company notice */}
      {form.payment_method === "finance_company" && (
        <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5">
          <span className="text-indigo-500 text-base leading-none">ℹ</span>
          <p className="text-sm text-indigo-700">
            Finance Company sales invoice the financial institution on behalf of the customer.
          </p>
        </div>
      )}

      {/* Buyer Customer — shown only when invoice customer is a finance company */}
      {requiresBuyer && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-amber-800">
              Buyer Customer <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              The invoice customer is a finance company. Select the actual buyer (personal or individual).
            </p>
          </div>
          <input
            type="text"
            placeholder="Search buyer by name, phone, or ID card…"
            value={buyerSearch}
            onChange={(e) => setBuyerSearch(e.target.value)}
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {buyerLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-amber-100 rounded-lg animate-pulse" />
              ))
            ) : buyerCandidates.length === 0 ? (
              <p className="text-sm text-amber-700 py-3 text-center">
                No personal / individual customers found.
              </p>
            ) : (
              buyerCandidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onBuyerCustomerChange(c)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors bg-white ${
                    buyerCustomer?.id === c.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-amber-200 hover:border-primary-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.phone}</p>
                    </div>
                    {c.type && <CustomerTypeBadge type={c.type} />}
                  </div>
                </button>
              ))
            )}
          </div>
          {buyerCustomerError && (
            <p className="text-xs text-red-600">{buyerCustomerError}</p>
          )}
        </div>
      )}

      {/* Finance Company Specific Fields */}
      {form.payment_method === "finance_company" && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-3">
          <h4 className="text-xs font-semibold text-indigo-900 border-b border-indigo-100 pb-1.5 uppercase tracking-wider">
            Finance Company Details
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Finance Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.finance_company_name || ""}
                onChange={(e) => set("finance_company_name", e.target.value)}
                placeholder="e.g. Aeon, Krungsri Auto"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.finance_company_name && (
                <p className="mt-1 text-xs text-red-600">{errors.finance_company_name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Institution Code (Optional)
              </label>
              <select
                value={form.financial_institution_id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const inst = institutions.find((i) => i.id === val);
                  onChange({
                    ...form,
                    financial_institution_id: val,
                    finance_company_name: inst ? inst.name : form.finance_company_name,
                  });
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">-- Select Code --</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Finance Reference Number (Optional)
              </label>
              <input
                type="text"
                value={form.finance_reference_number || ""}
                onChange={(e) => set("finance_reference_number", e.target.value)}
                placeholder="Reference No."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Commission Amount (THB) (Optional)
              </label>
              <input
                type="number"
                min={0}
                value={form.commission_amount || ""}
                onChange={(e) => set("commission_amount", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Price fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Price (THB) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.total_price}
            onChange={(e) => {
              const val = e.target.value;
              const numericVal = parseFloat(val) || 0;
              let nextDown = form.down_payment;
              if (form.payment_method === "cash") {
                nextDown = val;
              } else {
                const currentDown = parseFloat(form.down_payment) || 0;
                if (currentDown > numericVal) {
                  nextDown = val;
                }
              }
              onChange({
                ...form,
                total_price: val,
                down_payment: nextDown,
              });
            }}
            placeholder={String(motorcycle.sellingPrice)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.total_price && (
            <p className="mt-1 text-xs text-red-600">{errors.total_price}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Down Payment (THB)
          </label>
          <input
            type="number"
            min={0}
            value={form.down_payment}
            disabled={isCash}
            onChange={(e) => {
              const val = e.target.value;
              const numericVal = parseFloat(val) || 0;
              const currentTotal = parseFloat(form.total_price) || 0;
              let nextTotal = form.total_price;
              
              if (numericVal > currentTotal) {
                nextTotal = val;
              }
              
              onChange({
                ...form,
                down_payment: val,
                total_price: nextTotal,
              });
            }}
            placeholder="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          {errors.down_payment && (
            <p className="mt-1 text-xs text-red-600">{errors.down_payment}</p>
          )}
        </div>
      </div>

      {/* Interactive Range Slider for Down Payment */}
      {!isCash && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>ดาวน์ 0% (0 THB)</span>
            <span className="font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
              สัดส่วนดาวน์: {effectiveTotalPrice > 0 ? ((downPayment / effectiveTotalPrice) * 100).toFixed(0) : 0}%
            </span>
            <span>ดาวน์ 100% ({formatPrice(effectiveTotalPrice)})</span>
          </div>
          <input
            type="range"
            min={0}
            max={effectiveTotalPrice}
            step={100}
            value={downPayment}
            onChange={(e) => set("down_payment", e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
        </div>
      )}

      {/* Finance amount for installment */}
      {!isCash && financeAmount > 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Finance amount</span>
            <span className="font-semibold">{formatPrice(financeAmount)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Installment schedule will be set when creating a contract for this sale.
          </p>
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

// ─── Step 4 — Add-ons ─────────────────────────────────────────────────────────

function StepAddons({
  addons,
  loading,
  selected,
  onToggle,
  billingOptions,
  onChangeBillingOption,
  paymentMethod,
}: {
  addons: Addon[];
  loading: boolean;
  selected: string[];
  onToggle: (id: string) => void;
  billingOptions: Record<string, "pay_separately" | "included_in_finance" | "free_gift">;
  onChangeBillingOption: (id: string, option: "pay_separately" | "included_in_finance" | "free_gift") => void;
  paymentMethod: string;
}) {
  const totalAddonsPrice = addons
    .filter((a) => selected.includes(a.id))
    .reduce((sum, a) => {
      const option = billingOptions[a.id] || "pay_separately";
      return option === "free_gift" ? sum : sum + Number(a.price);
    }, 0);

  const paySeparatelyTotal = addons
    .filter((a) => selected.includes(a.id) && (billingOptions[a.id] || "pay_separately") === "pay_separately")
    .reduce((sum, a) => sum + Number(a.price), 0);

  const includedInFinanceTotal = addons
    .filter((a) => selected.includes(a.id) && (billingOptions[a.id] || "pay_separately") === "included_in_finance")
    .reduce((sum, a) => sum + Number(a.price), 0);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Add-on Services</h3>
      <p className="text-xs text-gray-500 mb-3">Optional. Select any add-ons to include and specify payment options.</p>
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse mb-2" />
        ))
      ) : addons.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No add-ons available.</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {addons.map((addon) => {
            const isSelected = selected.includes(addon.id);
            const billingOption = billingOptions[addon.id] || "pay_separately";
            return (
              <div
                key={addon.id}
                className={`p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary-500 bg-primary-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(addon.id)}
                  className="w-full text-left flex items-center justify-between"
                >
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
                      <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                      {addon.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">
                    {formatPrice(addon.price)}
                  </span>
                </button>

                {isSelected && (
                  <div className="mt-3 pt-2.5 border-t border-primary-100 flex items-center justify-between gap-4 text-xs">
                    <span className="text-gray-500 font-medium">รูปแบบการจ่ายเงิน:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeBillingOption(addon.id, "pay_separately");
                        }}
                        className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors ${
                          billingOption === "pay_separately"
                            ? "bg-primary-600 border-primary-600 text-white"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        จ่ายแยก
                      </button>
                      {paymentMethod !== "cash" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChangeBillingOption(addon.id, "included_in_finance");
                          }}
                          className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors ${
                            billingOption === "included_in_finance"
                              ? "bg-primary-600 border-primary-600 text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          รวมในยอดจัด
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeBillingOption(addon.id, "free_gift");
                        }}
                        className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors ${
                          billingOption === "free_gift"
                            ? "bg-primary-600 border-primary-600 text-white"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        แถมฟรี (ส่วนลด)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1.5">
          <div className="flex justify-between font-semibold text-gray-700">
            <span>มูลค่ารวม (Add-ons total):</span>
            <span className="text-sm font-bold text-gray-900">{formatPrice(totalAddonsPrice)}</span>
          </div>
          {paySeparatelyTotal > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>จ่ายแยก (Pay separately):</span>
              <span>{formatPrice(paySeparatelyTotal)}</span>
            </div>
          )}
          {includedInFinanceTotal > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>รวมในยอดจัด (Finance payout):</span>
              <span>{formatPrice(includedInFinanceTotal)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 5 — Confirm ─────────────────────────────────────────────────────────

function StepConfirm({
  invoiceCustomer,
  buyerCustomer,
  motorcycle,
  pricing,
  addons,
  addonIds,
  addonBillingOptions,
}: {
  invoiceCustomer: Customer;
  buyerCustomer: Customer | null;
  motorcycle: Motorcycle;
  pricing: PricingForm;
  addons: Addon[];
  addonIds: string[];
  addonBillingOptions: Record<string, string>;
}) {
  const totalPrice = parseFloat(pricing.total_price) || 0;
  const downPayment = parseFloat(pricing.down_payment) || 0;

  const baseFinanceAmount = Math.max(0, totalPrice - downPayment);
  const addonsFinanceAmount = addons
    .filter((a) => addonIds.includes(a.id) && (addonBillingOptions[a.id] || "pay_separately") === "included_in_finance")
    .reduce((sum, a) => sum + Number(a.price), 0);
  const totalFinanceAmount = baseFinanceAmount + addonsFinanceAmount;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Confirm Sale</h3>

      {pricing.payment_method === "cash" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
          <span className="text-green-600 text-sm">✓</span>
          <p className="text-sm text-green-700">
            This cash sale will be marked as <strong>completed</strong> immediately.
          </p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
        {/* Invoice Customer */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Invoice Customer</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{invoiceCustomer.name}</p>
            {invoiceCustomer.type && <CustomerTypeBadge type={invoiceCustomer.type} />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{invoiceCustomer.phone}</p>
        </div>

        {/* Buyer Customer (only shown when applicable) */}
        {buyerCustomer && buyerCustomer.id !== invoiceCustomer.id && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Buyer Customer</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{buyerCustomer.name}</p>
              {buyerCustomer.type && <CustomerTypeBadge type={buyerCustomer.type} />}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{buyerCustomer.phone}</p>
          </div>
        )}

        {/* Motorcycle */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Motorcycle</p>
          <p className="text-sm font-medium text-gray-900">
            {motorcycle.brand} {motorcycle.model} {motorcycle.year}
          </p>
          <p className="text-xs text-gray-500">
            {motorcycle.color} · {motorcycle.chassisNumber}
          </p>
        </div>

        {/* Pricing summary */}
        <div className="px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment method</span>
            <span className="font-medium">{PAYMENT_METHOD_DISPLAY[pricing.payment_method]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total price</span>
            <span className="font-medium">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Down payment</span>
            <span className="font-medium">{formatPrice(downPayment)}</span>
          </div>
          {pricing.payment_method !== "cash" && totalFinanceAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Finance amount</span>
              <span className="font-medium">{formatPrice(totalFinanceAmount)}</span>
            </div>
          )}
          {pricing.payment_method === "finance_company" && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Finance Company</span>
                <span className="font-medium">{pricing.finance_company_name}</span>
              </div>
              {pricing.commission_amount && parseFloat(pricing.commission_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Commission</span>
                  <span className="font-medium">{formatPrice(parseFloat(pricing.commission_amount))}</span>
                </div>
              )}
              {pricing.finance_reference_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Finance Ref #</span>
                  <span className="font-medium">{pricing.finance_reference_number}</span>
                </div>
              )}
            </>
          )}
          {addonIds.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Add-ons</span>
              <span className="font-medium">{addonIds.length} selected</span>
            </div>
          )}
          {pricing.notes && (
            <div className="flex justify-between">
              <span className="text-gray-500">Notes</span>
              <span className="font-medium text-right max-w-[60%]">{pricing.notes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Sale Modal Form ──────────────────────────────────────────────────────

const INITIAL_PRICING: PricingForm = {
  payment_method: "cash",
  total_price: "",
  down_payment: "",
  notes: "",
  finance_company_name: "",
  commission_amount: "",
  financial_institution_id: "",
  finance_reference_number: "",
};

interface NewSaleFormProps {
  onSuccess: (saleId: string) => void;
  onCancel: () => void;
  prefilledCustomerId?: string;
}

function NewSaleForm({ onSuccess, onCancel, prefilledCustomerId }: NewSaleFormProps) {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState<Customer | null>(null); // invoice customer
  const [buyerCustomer, setBuyerCustomer] = useState<Customer | null>(null);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [pricing, setPricing] = useState<PricingForm>(INITIAL_PRICING);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [addonBillingOptions, setAddonBillingOptions] = useState<Record<string, "pay_separately" | "included_in_finance" | "free_gift">>({});
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [pricingErrors, setPricingErrors] = useState<Partial<PricingForm>>({});
  const [buyerCustomerError, setBuyerCustomerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdSale, setCreatedSale] = useState<SaleWithInstallments | null>(null);

  useEffect(() => {
    setAddonsLoading(true);
    apiFetch<{ data: Addon[] }>("/addons")
      .then((res) => setAddons(res.data.filter((a) => a.active)))
      .catch(() => setAddons([]))
      .finally(() => setAddonsLoading(false));
  }, []);

  // Pre-fill customer when navigated from customer detail page
  useEffect(() => {
    if (prefilledCustomerId && !customer) {
      apiFetch<{ data: Customer }>(`/customers/${prefilledCustomerId}`)
        .then((res) => {
          setCustomer(res.data);
          setStep(2);
        })
        .catch(() => {});
    }
  }, [prefilledCustomerId, customer]);

  // Automatically pre-fill total price and cash down payment when motorcycle is selected
  useEffect(() => {
    if (motorcycle) {
      setPricing((prev) => {
        const priceStr = String(motorcycle.sellingPrice);
        const numericPrice = Number(motorcycle.sellingPrice);
        return {
          ...prev,
          total_price: priceStr,
          down_payment:
            prev.payment_method === "cash"
              ? priceStr
              : String(Math.round(numericPrice * 0.25)),
        };
      });
    } else {
      setPricing((prev) => ({
        ...prev,
        total_price: "",
        down_payment: "",
      }));
    }
  }, [motorcycle]);

  function toggleAddon(id: string) {
    setAddonIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        setAddonBillingOptions((prevOptions) => {
          const next = { ...prevOptions };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      } else {
        setAddonBillingOptions((prevOptions) => ({
          ...prevOptions,
          [id]: "pay_separately",
        }));
        return [...prev, id];
      }
    });
  }

  function validatePricing(): boolean {
    const errors: Partial<PricingForm> = {};
    const totalPrice = parseFloat(pricing.total_price);
    if (!pricing.total_price || isNaN(totalPrice) || totalPrice <= 0) {
      errors.total_price = "Enter a valid total price";
    }
    const downPayment = parseFloat(pricing.down_payment);
    if (pricing.down_payment !== "" && (isNaN(downPayment) || downPayment < 0)) {
      errors.down_payment = "Enter a valid down payment";
    }

    if (pricing.payment_method === "finance_company") {
      if (!pricing.finance_company_name?.trim()) {
        errors.finance_company_name = "Finance company name is required";
      }
      const commission = parseFloat(pricing.commission_amount || "0");
      if (pricing.commission_amount !== "" && (isNaN(commission) || commission < 0)) {
        errors.commission_amount = "Enter a valid commission amount";
      }
    }

    setPricingErrors(errors);

    // Buyer customer required when invoice customer is a finance company
    const requiresBuyer = customer?.type === "finance";
    if (requiresBuyer && !buyerCustomer) {
      setBuyerCustomerError("Select the actual buyer customer");
      return false;
    }
    setBuyerCustomerError(null);

    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (step === 3 && !validatePricing()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    // Only the explicit confirm button on the final step may create the sale
    if (step !== 5 || submitting) return;
    if (!customer || !motorcycle) return;

    const methodLabel =
      pricing.payment_method === "cash"
        ? "เงินสด (Cash)"
        : pricing.payment_method === "installment"
        ? "ผ่อนกับร้าน (Installment)"
        : "ไฟแนนซ์ (Finance Company)";
    const confirmed = await confirm({
      title: "ยืนยันการสร้างรายการขาย?",
      text: `${customer.name} · ${motorcycle.brand} ${motorcycle.model} · ${methodLabel} · ยอดรวม ${formatPrice(parseFloat(pricing.total_price) || 0)}`,
      confirmText: "ยืนยัน สร้างรายการขาย",
      cancelText: "ยกเลิก",
      icon: "question",
    });
    if (!confirmed) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const body: Record<string, unknown> = {
        invoice_customer_id: customer.id,
        motorcycle_id: motorcycle.id,
        total_price: parseFloat(pricing.total_price),
        down_payment: parseFloat(pricing.down_payment) || 0,
        payment_method: pricing.payment_method,
      };
      if (buyerCustomer) {
        body.buyer_customer_id = buyerCustomer.id;
      }
      if (pricing.payment_method === "finance_company") {
        body.finance_company_name = pricing.finance_company_name;
        if (pricing.commission_amount) {
          body.commission_amount = parseFloat(pricing.commission_amount);
        }
        if (pricing.financial_institution_id) {
          body.financial_institution_id = pricing.financial_institution_id;
        }
        if (pricing.finance_reference_number) {
          body.finance_reference_number = pricing.finance_reference_number;
        }
      }
      if (addonIds.length > 0) {
        body.addons = addonIds.map((id) => ({
          id,
          billing_option: addonBillingOptions[id] || "pay_separately",
        }));
      }
      if (pricing.notes.trim()) body.notes = pricing.notes.trim();

      const res = await apiFetch<{ data: SaleWithInstallments }>("/sales", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toastSuccess("Sale created successfully");
      setCreatedSale(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create sale";
      setSubmitError(msg);
      alertError(msg);
      setSubmitting(false);
    }
  }

  const requiresBuyerCustomer = customer?.type === "finance";
  const canAdvance =
    (step === 1 && customer !== null) ||
    (step === 2 && motorcycle !== null) ||
    (step === 3 && (!requiresBuyerCustomer || buyerCustomer !== null)) ||
    step === 4;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
    }
  };

  if (createdSale) {
    const totalPrice = createdSale.totalPrice || 0;
    const downPayment = createdSale.downPayment || 0;
    const financeAmount = createdSale.financeAmount || 0;

    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-50 border-2 border-green-200 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold animate-bounce">
          ✓
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          สร้างรายการขายสำเร็จ! (Sale Created Successfully)
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          รายการขายนี้ได้รับการบันทึกเรียบร้อยแล้ว
        </p>

        <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 text-left max-w-md mx-auto mb-6 text-sm">
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500">รหัสการขาย (Sale ID)</span>
            <span className="font-mono text-xs text-gray-900 bg-gray-100 px-1 py-0.5 rounded">{createdSale.id}</span>
          </div>
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500">ลูกค้า (Customer)</span>
            <span className="font-medium text-gray-900">{customer?.name}</span>
          </div>
          {buyerCustomer && buyerCustomer.id !== customer?.id && (
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500">ผู้เช่าซื้อ (Buyer Customer)</span>
              <span className="font-medium text-gray-900">{buyerCustomer.name}</span>
            </div>
          )}
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500">รถจักรยานยนต์ (Motorcycle)</span>
            <span className="font-medium text-gray-900">{motorcycle?.brand} {motorcycle?.model}</span>
          </div>
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500">รูปแบบการชำระ (Payment Method)</span>
            <span className="font-medium text-gray-900 capitalize">{pricing.payment_method}</span>
          </div>
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500">ราคาสุทธิ (Total Price)</span>
            <span className="font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
          </div>
          <div className="px-4 py-3 flex justify-between">
            <span className="text-gray-500">เงินดาวน์ (Down Payment)</span>
            <span className="font-medium text-gray-900">{formatPrice(downPayment)}</span>
          </div>
          {pricing.payment_method !== "cash" && (
            <div className="px-4 py-3 flex justify-between">
              <span className="text-gray-500">ยอดจัดไฟแนนซ์ (Finance Amount)</span>
              <span className="font-semibold text-primary-700">{formatPrice(financeAmount)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1"
          >
            ปิดหน้าต่างนี้ (Close)
          </button>
          <button
            type="button"
            onClick={() => onSuccess(createdSale.id)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors flex-1 shadow-sm font-semibold"
          >
            ยืนยัน & ไปหน้ารายละเอียดการขาย
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDown}>
      <StepIndicator current={step} />

      {step === 1 && <StepCustomer selected={customer} onSelect={setCustomer} />}
      {step === 2 && <StepMotorcycle selected={motorcycle} onSelect={setMotorcycle} />}
      {step === 3 && motorcycle && (
        <StepPricing
          motorcycle={motorcycle}
          form={pricing}
          onChange={setPricing}
          errors={pricingErrors}
          invoiceCustomer={customer}
          buyerCustomer={buyerCustomer}
          onBuyerCustomerChange={setBuyerCustomer}
          buyerCustomerError={buyerCustomerError}
        />
      )}
      {step === 4 && (
        <StepAddons
          addons={addons}
          loading={addonsLoading}
          selected={addonIds}
          onToggle={toggleAddon}
          billingOptions={addonBillingOptions}
          onChangeBillingOption={(id, option) =>
            setAddonBillingOptions((prev) => ({ ...prev, [id]: option }))
          }
          paymentMethod={pricing.payment_method}
        />
      )}
      {step === 5 && customer && motorcycle && (
        <StepConfirm
          invoiceCustomer={customer}
          buyerCustomer={buyerCustomer}
          motorcycle={motorcycle}
          pricing={pricing}
          addons={addons}
          addonIds={addonIds}
          addonBillingOptions={addonBillingOptions}
        />
      )}

      {submitError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Navigation */}
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

        {step < 5 ? (
          <button
            key="continue"
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            key="confirm"
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating sale…" : "Confirm & Create Sale"}
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Sales Page ───────────────────────────────────────────────────────────────

function SalesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openNew = searchParams.get("open") === "new";
  const prefilledCustomerId = searchParams.get("customer_id") ?? undefined;

  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Auto-open modal when arriving via ?open=new
  useEffect(() => {
    if (openNew) setShowNewModal(true);
  }, [openNew]);

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

  function handleSaleSuccess(saleId: string) {
    setShowNewModal(false);
    router.push(`/sales/${saleId}`);
  }

  function handleCancelModal() {
    setShowNewModal(false);
    fetchSales(page, statusFilter);
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
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <span>+</span> New Sale
          </button>
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
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Sale Date</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Method</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Total Price</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Down Payment</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Finance Amount</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
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
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                      No sales found.{" "}
                      <button
                        onClick={() => setShowNewModal(true)}
                        className="text-primary-600 hover:underline"
                      >
                        Create one?
                      </button>
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-600">{formatDate(sale.saleDate)}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {PAYMENT_METHOD_DISPLAY[sale.paymentMethod] ?? sale.paymentMethod}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatPrice(sale.totalPrice)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {formatPrice(sale.downPayment)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {sale.paymentMethod !== "cash" && sale.financeAmount > 0
                          ? formatPrice(sale.financeAmount)
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

      {/* New Sale Modal */}
      <FormModal
        open={showNewModal}
        onClose={handleCancelModal}
        title="New Sale"
        maxWidth="max-w-2xl"
      >
        <NewSaleForm
          onSuccess={handleSaleSuccess}
          onCancel={handleCancelModal}
          prefilledCustomerId={prefilledCustomerId}
        />
      </FormModal>
    </DashboardLayout>
  );
}

export default function SalesPage() {
  return (
    <Suspense>
      <SalesPageInner />
    </Suspense>
  );
}

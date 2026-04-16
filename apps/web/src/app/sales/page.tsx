"use client";

import { useEffect, useState, useCallback, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FormModal from "@/components/FormModal";
import { apiFetch } from "@/lib/api";
import { toastSuccess, alertError } from "@/lib/swal";
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

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Customer", "Motorcycle", "Pricing", "Add-ons", "Confirm"];

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
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
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
  financial_institution_id: string;
  finance_reference_number: string;
  notes: string;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  installment: "Installment",
  finance_company: "Finance Company",
};

function StepPricing({
  motorcycle,
  form,
  onChange,
  errors,
}: {
  motorcycle: Motorcycle;
  form: PricingForm;
  onChange: (f: PricingForm) => void;
  errors: Partial<PricingForm>;
}) {
  const [financialInstitutions, setFinancialInstitutions] = useState<FinancialInstitution[]>([]);

  const set = (field: keyof PricingForm, value: string) =>
    onChange({ ...form, [field]: value });

  const isCash = form.payment_method === "cash";
  const isFinanceCompany = form.payment_method === "finance_company";
  const totalPrice = parseFloat(form.total_price) || 0;
  const downPayment = parseFloat(form.down_payment) || 0;
  const financeAmount = Math.max(0, totalPrice - downPayment);

  // Fetch financial institutions when finance_company is selected
  useEffect(() => {
    if (!isFinanceCompany) return;
    apiFetch<{ data: FinancialInstitution[] }>("/financial-institutions?active=true")
      .then((res) => setFinancialInstitutions(res.data))
      .catch(() => setFinancialInstitutions([]));
  }, [isFinanceCompany]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Configure Pricing</h3>

      {/* Cash auto-complete notice */}
      {isCash && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
          <span className="text-green-600 text-sm">✓</span>
          <p className="text-sm text-green-700">
            Cash sales are marked as <strong>completed</strong> immediately upon creation.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Payment Method
        </label>
        <div className="flex gap-2 flex-wrap">
          {(["cash", "installment", "finance_company"] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => set("payment_method", method)}
              className={`flex-1 min-w-[100px] py-2 rounded-lg border text-sm font-medium transition-colors ${
                form.payment_method === method
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {PAYMENT_METHOD_LABELS[method]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Price (THB) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={form.total_price}
            onChange={(e) => set("total_price", e.target.value)}
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
            onChange={(e) => set("down_payment", e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.down_payment && (
            <p className="mt-1 text-xs text-red-600">{errors.down_payment}</p>
          )}
        </div>
      </div>

      {/* Finance company fields */}
      {isFinanceCompany && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Financial Institution <span className="text-red-500">*</span>
            </label>
            {financialInstitutions.length > 0 ? (
              <select
                value={form.financial_institution_id}
                onChange={(e) => set("financial_institution_id", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              >
                <option value="">Select financial institution…</option>
                {financialInstitutions.map((fi) => (
                  <option key={fi.id} value={fi.id}>
                    {fi.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.financial_institution_id}
                onChange={(e) => set("financial_institution_id", e.target.value)}
                placeholder="Financial institution name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            )}
            {errors.financial_institution_id && (
              <p className="mt-1 text-xs text-red-600">{errors.financial_institution_id}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Finance Reference Number
            </label>
            <input
              type="text"
              value={form.finance_reference_number}
              onChange={(e) => set("finance_reference_number", e.target.value)}
              placeholder="Optional reference number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {financeAmount > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
              <div className="flex justify-between text-blue-700">
                <span>Finance amount</span>
                <span className="font-semibold">{formatPrice(financeAmount)}</span>
              </div>
              <p className="text-xs text-blue-500 mt-1">
                Installment terms will be set when linking this sale to a contract.
              </p>
            </div>
          )}
        </>
      )}

      {/* Installment — no terms at sale level, managed via contract */}
      {form.payment_method === "installment" && financeAmount > 0 && (
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
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ data: Addon[] }>("/addons")
      .then((res) => setAddons(res.data.filter((a) => a.active)))
      .catch(() => setAddons([]))
      .finally(() => setLoading(false));
  }, []);

  const total = addons
    .filter((a) => selected.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Add-on Services</h3>
      <p className="text-xs text-gray-500 mb-3">Optional. Select any add-ons to include.</p>
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse mb-2" />
        ))
      ) : addons.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No add-ons available.</p>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto">
          {addons.map((addon) => {
            const isSelected = selected.includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => onToggle(addon.id)}
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
                      <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                      {addon.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{addon.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">
                    {formatPrice(addon.price)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-3 text-sm font-semibold text-gray-900 text-right">
          Add-ons total: {formatPrice(total)}
        </div>
      )}
    </div>
  );
}

// ─── Step 5 — Confirm ─────────────────────────────────────────────────────────

function StepConfirm({
  customer,
  motorcycle,
  pricing,
  addonIds,
  financialInstitutions,
}: {
  customer: Customer;
  motorcycle: Motorcycle;
  pricing: PricingForm;
  addonIds: string[];
  financialInstitutions: FinancialInstitution[];
}) {
  const totalPrice = parseFloat(pricing.total_price) || 0;
  const downPayment = parseFloat(pricing.down_payment) || 0;
  const financeAmount = Math.max(0, totalPrice - downPayment);

  const selectedFI = financialInstitutions.find(
    (fi) => fi.id === pricing.financial_institution_id
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Confirm Sale</h3>

      {/* Cash auto-complete notice */}
      {pricing.payment_method === "cash" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
          <span className="text-green-600 text-sm">✓</span>
          <p className="text-sm text-green-700">
            This cash sale will be marked as <strong>completed</strong> immediately.
          </p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Customer</p>
          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
          <p className="text-xs text-gray-500">{customer.phone}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Motorcycle</p>
          <p className="text-sm font-medium text-gray-900">
            {motorcycle.brand} {motorcycle.model} {motorcycle.year}
          </p>
          <p className="text-xs text-gray-500">
            {motorcycle.color} · {motorcycle.chassisNumber}
          </p>
        </div>
        <div className="px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Payment method</span>
            <span className="font-medium">{PAYMENT_METHOD_LABELS[pricing.payment_method]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total price</span>
            <span className="font-medium">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Down payment</span>
            <span className="font-medium">{formatPrice(downPayment)}</span>
          </div>
          {pricing.payment_method !== "cash" && financeAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Finance amount</span>
              <span className="font-medium">{formatPrice(financeAmount)}</span>
            </div>
          )}
          {pricing.payment_method === "finance_company" && (
            <>
              {selectedFI ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">Financial institution</span>
                  <span className="font-medium">{selectedFI.name}</span>
                </div>
              ) : pricing.financial_institution_id ? (
                <div className="flex justify-between">
                  <span className="text-gray-500">Financial institution</span>
                  <span className="font-medium">{pricing.financial_institution_id}</span>
                </div>
              ) : null}
              {pricing.finance_reference_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference #</span>
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
  payment_method: "finance_company",
  total_price: "",
  down_payment: "",
  financial_institution_id: "",
  finance_reference_number: "",
  notes: "",
};

interface NewSaleFormProps {
  onSuccess: (saleId: string) => void;
  onCancel: () => void;
  prefilledCustomerId?: string;
}

function NewSaleForm({ onSuccess, onCancel, prefilledCustomerId }: NewSaleFormProps) {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [pricing, setPricing] = useState<PricingForm>(INITIAL_PRICING);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [pricingErrors, setPricingErrors] = useState<Partial<PricingForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Cache financial institutions fetched during StepPricing for use in StepConfirm
  const [financialInstitutions, setFinancialInstitutions] = useState<FinancialInstitution[]>([]);

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

  // Fetch financial institutions for the confirm step display
  useEffect(() => {
    apiFetch<{ data: FinancialInstitution[] }>("/financial-institutions?active=true")
      .then((res) => setFinancialInstitutions(res.data))
      .catch(() => setFinancialInstitutions([]));
  }, []);

  function toggleAddon(id: string) {
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
    if (
      pricing.payment_method === "finance_company" &&
      !pricing.financial_institution_id.trim()
    ) {
      errors.financial_institution_id = "Select or enter a financial institution";
    }
    setPricingErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (step === 3 && !validatePricing()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customer || !motorcycle) return;
    setSubmitting(true);
    setSubmitError(null);

    // Resolve FI name from dropdown if applicable
    const selectedFI = financialInstitutions.find(
      (fi) => fi.id === pricing.financial_institution_id
    );

    try {
      const body: Record<string, unknown> = {
        customer_id: customer.id,
        motorcycle_id: motorcycle.id,
        total_price: parseFloat(pricing.total_price),
        down_payment: parseFloat(pricing.down_payment) || 0,
        payment_method: pricing.payment_method,
      };
      if (pricing.payment_method === "finance_company") {
        // Send name for current backend compatibility; ID for when backend supports it
        body.finance_company_name = selectedFI?.name ?? pricing.financial_institution_id;
        if (selectedFI) {
          body.financial_institution_id = selectedFI.id;
        }
        if (pricing.finance_reference_number.trim()) {
          body.finance_reference_number = pricing.finance_reference_number.trim();
        }
      }
      if (addonIds.length > 0) body.addon_ids = addonIds;
      if (pricing.notes.trim()) body.notes = pricing.notes.trim();

      const res = await apiFetch<{ data: SaleWithInstallments }>("/sales", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toastSuccess("Sale created successfully");
      onSuccess(res.data.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create sale";
      setSubmitError(msg);
      alertError(msg);
      setSubmitting(false);
    }
  }

  const canAdvance =
    (step === 1 && customer !== null) ||
    (step === 2 && motorcycle !== null) ||
    step === 3 ||
    step === 4;

  return (
    <form onSubmit={handleSubmit}>
      <StepIndicator current={step} />

      {step === 1 && <StepCustomer selected={customer} onSelect={setCustomer} />}
      {step === 2 && <StepMotorcycle selected={motorcycle} onSelect={setMotorcycle} />}
      {step === 3 && motorcycle && (
        <StepPricing
          motorcycle={motorcycle}
          form={pricing}
          onChange={setPricing}
          errors={pricingErrors}
        />
      )}
      {step === 4 && <StepAddons selected={addonIds} onToggle={toggleAddon} />}
      {step === 5 && customer && motorcycle && (
        <StepConfirm
          customer={customer}
          motorcycle={motorcycle}
          pricing={pricing}
          addonIds={addonIds}
          financialInstitutions={financialInstitutions}
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
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod as PaymentMethod] ?? sale.paymentMethod}
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
        onClose={() => setShowNewModal(false)}
        title="New Sale"
        maxWidth="max-w-2xl"
      >
        <NewSaleForm
          onSuccess={handleSaleSuccess}
          onCancel={() => setShowNewModal(false)}
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
